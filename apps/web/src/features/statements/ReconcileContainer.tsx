import type { Currency } from "@miplata/shared";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { ReconcileScreen } from "./ReconcileScreen";
import { buildReconcile, type ReconcileForm, reconcileFormFrom } from "./statement-forms";
import { totalsFor } from "./statement-view";
import { saveBankFigures } from "./statements-api";
import { useStatementData } from "./useStatementData";

export function ReconcileContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const navigate = useNavigate();
  const { accountId = "" } = useParams();
  const [search] = useSearchParams();
  const period = search.get("period");
  const data = useStatementData(accountId, period);
  const [form, setForm] = useState<ReconcileForm | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ReconcileForm, true>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const initialised = useRef(false);

  const statementPath = `/accounts/${accountId}/statement${period ? `?period=${period}` : ""}`;
  const back = { to: statementPath, label: t("statements.reconcile.back") };
  const title = t("statements.reconcile.title");

  useEffect(() => {
    if (initialised.current || data.status !== "ready" || !data.detail) {
      return;
    }
    initialised.current = true;
    setForm(reconcileFormFrom(totalsFor(data.detail, "ARS"), totalsFor(data.detail, "USD")));
  }, [data.status, data.detail]);

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
  const held = (["ARS", "USD"] as Currency[]).filter((currency) => totalsFor(detail, currency));
  const keys: Record<Currency, { total: keyof ReconcileForm; minimum: keyof ReconcileForm }> = {
    ARS: { total: "arsTotal", minimum: "arsMinimum" },
    USD: { total: "usdTotal", minimum: "usdMinimum" },
  };

  function change(key: keyof ReconcileForm, value: string) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setErrors({});
    setFailure(null);
  }

  async function submit() {
    if (!form) {
      return;
    }
    const built = buildReconcile(form);
    if (!built.ok) {
      setErrors(built.errors);
      return;
    }
    setBusy(true);
    const result = await saveBankFigures(detail.id, built.value);
    setBusy(false);
    if (result.ok) {
      navigate(statementPath);
      return;
    }
    setFailure(
      result.error === "currency_not_in_account"
        ? t("statements.failures.currency_not_in_account")
        : t("statements.failures.saveFailed"),
    );
  }

  const field = (currency: Currency, kind: "total" | "minimum") => {
    const key = keys[currency][kind];
    return {
      key,
      label: t(
        kind === "total" ? "statements.reconcile.bankTotal" : "statements.reconcile.minimum",
        {
          currency,
        },
      ),
      value: form[key],
      error: errors[key] ? t("statements.reconcile.errors.amount") : undefined,
      onChange: (value: string) => change(key, value),
    };
  };

  return (
    <ReconcileScreen
      title={title}
      back={back}
      hint={t("statements.reconcile.hint")}
      groups={held.map((currency) => ({
        key: currency,
        calculated: t("statements.reconcile.calculated", {
          amount: formatMoney(
            (totalsFor(detail, currency)?.totalMinor ?? 0) / 100,
            currency,
            locale,
          ),
        }),
        fields: [field(currency, "total"), field(currency, "minimum")],
      }))}
      failure={failure}
      submit={{
        label: busy ? t("statements.reconcile.saving") : t("statements.reconcile.save"),
        busy,
        onSubmit: submit,
      }}
    />
  );
}
