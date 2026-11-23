import type { Account, Currency } from "@miplata/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { displayName } from "../accounts/account-display";
import { PayStatementScreen } from "./PayStatementScreen";
import { amountsFor, buildPayment, emptyPayForm, hasMinimum, type PayForm } from "./pay-form";
import { totalsFor } from "./statement-view";
import { payStatement } from "./statements-api";
import { useStatementData } from "./useStatementData";

const KNOWN_FAILURES = new Set([
  "account_inactive",
  "account_not_allowed",
  "account_not_found",
  "currency_not_in_account",
]);

function canPayFrom(account: Account): boolean {
  return account.isActive && account.type !== "person" && account.type !== "credit_card";
}

export function PayStatementContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const navigate = useNavigate();
  const { accountId = "" } = useParams();
  const [search] = useSearchParams();
  const data = useStatementData(accountId, search.get("period"));
  const [form, setForm] = useState<PayForm | null>(null);
  const [errors, setErrors] = useState<Record<string, true>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initialised = useRef(false);

  const statementPath = `/accounts/${accountId}/statement${search.get("period") ? `?period=${search.get("period")}` : ""}`;
  const back = { to: statementPath, label: t("statements.pay.back") };
  const title = t("statements.pay.title");

  useEffect(() => {
    if (initialised.current || data.status !== "ready" || !data.detail) {
      return;
    }
    initialised.current = true;
    const sources = data.accounts.filter(canPayFrom);
    const only = sources.length === 1 ? sources[0] : undefined;
    setForm({ ...emptyPayForm(data.detail.dueDate), sourceId: only?.id ?? null });
  }, [data.status, data.detail, data.accounts]);

  if (data.status === "error") {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState
          title={t("statements.loadFailed")}
          action={
            <Button variant="ghost" onClick={data.reload}>
              {t("statements.retry")}
            </Button>
          }
        />
      </>
    );
  }
  if (!form || !data.detail) {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <p className="screen-note" role="status">
          {t("statements.loading")}
        </p>
      </>
    );
  }

  const detail = data.detail;
  const ars = totalsFor(detail, "ARS");
  const usd = totalsFor(detail, "USD");
  const amounts = amountsFor(form, ars, usd);
  const money = (minor: number, currency: Currency) => formatMoney(minor / 100, currency, locale);
  const source = data.accounts.find((account) => account.id === form.sourceId);
  const sourceName = source ? displayName(source, t) : t("statements.pay.choose");
  const showUsd = Boolean(usd) && ((usd?.totalMinor ?? 0) > 0 || form.mode === "other");
  const editable = form.mode === "other";

  function change(patch: Partial<PayForm>) {
    setForm((current) => (current ? { ...current, ...patch } : current));
    setErrors({});
    setFailure(null);
  }

  async function submit() {
    if (!form) {
      return;
    }
    const built = buildPayment(form, amounts);
    if (!built.ok) {
      setErrors(built.errors as Record<string, true>);
      return;
    }
    setBusy(true);
    const result = await payStatement(detail.id, built.value);
    setBusy(false);
    if (result.ok) {
      navigate(statementPath);
      return;
    }
    setFailure(
      KNOWN_FAILURES.has(result.error)
        ? t(`statements.failures.${result.error}`)
        : t("statements.failures.saveFailed"),
    );
  }

  const legs = [
    {
      key: "ARS",
      caption: t("statements.pay.pesosFrom"),
      amount: money(amounts?.arsMinor ?? 0, "ARS"),
      editLabel: t("statements.pay.arsAmount"),
      value: form.arsText,
      editable,
      error: errors.amount && editable ? t("statements.pay.errors.amount") : undefined,
      onChange: (value: string) => change({ arsText: value }),
      account: sourceName,
    },
    ...(showUsd
      ? [
          {
            key: "USD",
            caption: t("statements.pay.dollarsFrom"),
            amount: money(amounts?.usdMinor ?? 0, "USD"),
            editLabel: t("statements.pay.usdAmount"),
            value: form.usdText,
            editable,
            error: errors.amount && editable ? t("statements.pay.errors.amount") : undefined,
            onChange: (value: string) => change({ usdText: value }),
            account: form.usdWithPesos ? `${sourceName} · ARS` : `${sourceName} · USD`,
          },
        ]
      : []),
  ];

  const parts = [
    (amounts?.arsMinor ?? 0) > 0 ? money(amounts?.arsMinor ?? 0, "ARS") : null,
    (amounts?.usdMinor ?? 0) > 0 ? money(amounts?.usdMinor ?? 0, "USD") : null,
  ].filter((part): part is string => part !== null);

  const modes = [
    { value: "total", label: t("statements.pay.total") },
    ...(hasMinimum(ars, usd) ? [{ value: "minimum", label: t("statements.pay.minimum") }] : []),
    { value: "other", label: t("statements.pay.other") },
  ];

  return (
    <PayStatementScreen
      title={title}
      back={back}
      modeLabel={t("statements.pay.mode")}
      modes={modes}
      mode={form.mode}
      onMode={(mode) => change({ mode: mode as PayForm["mode"] })}
      legs={legs}
      exchange={
        showUsd && (amounts?.usdMinor ?? 0) > 0
          ? {
              label: t("statements.pay.usdWithPesos"),
              checked: form.usdWithPesos,
              onChange: (checked) => change({ usdWithPesos: checked }),
              field: {
                label: t("statements.pay.pesosSpent"),
                value: form.pesosText,
                error: errors.pesos ? t("statements.pay.errors.pesos") : undefined,
                onChange: (value) => change({ pesosText: value }),
              },
            }
          : null
      }
      source={{
        label: t("statements.pay.fromAccount"),
        value: form.sourceId ?? "",
        options: [
          { value: "", label: t("statements.pay.choose") },
          ...data.accounts
            .filter((account) => canPayFrom(account) || account.id === form.sourceId)
            .map((account) => ({ value: account.id, label: displayName(account, t) })),
        ],
        error: errors.source ? t("statements.pay.errors.source") : undefined,
        onChange: (value) => change({ sourceId: value || null }),
      }}
      date={{
        label: t("statements.pay.date"),
        value: form.date,
        error: errors.date ? t("statements.pay.errors.date") : undefined,
        onChange: (value) => change({ date: value }),
      }}
      amountError={errors.amount ? t("statements.pay.errors.amount") : undefined}
      note={t("statements.pay.note")}
      failure={failure}
      submit={{
        label: busy
          ? t("statements.pay.saving")
          : parts.length > 0
            ? t("statements.pay.submit", { amount: parts.join(" + ") })
            : t("statements.pay.submitNothing"),
        busy,
        onSubmit: submit,
      }}
    />
  );
}
