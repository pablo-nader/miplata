import type { Currency, StatementDetail } from "@miplata/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../../ui/atoms/Button";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { EmptyState } from "../../ui/molecules/EmptyState";
import { ScreenHeader } from "../../ui/molecules/ScreenHeader";
import { displayName } from "../accounts/account-display";
import { StatementScreen } from "./StatementScreen";
import { buildDates } from "./statement-forms";
import {
  adjustmentOf,
  hasActivity,
  monthLabel,
  owedByPerson,
  positiveDifference,
  shortDate,
  totalsFor,
} from "./statement-view";
import { adjustStatement, updateStatementDates } from "./statements-api";
import { useStatementData } from "./useStatementData";

const CURRENCIES: Currency[] = ["ARS", "USD"];
const DATES_FAILURES = new Set(["closing_outside_period", "due_before_closing", "invalid_date"]);
const KNOWN_FAILURES = new Set([
  "bank_total_missing",
  "category_inactive",
  "category_not_found",
  "no_positive_difference",
]);

export function StatementContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const navigate = useNavigate();
  const { accountId = "" } = useParams();
  const [search] = useSearchParams();
  const period = search.get("period");
  const data = useStatementData(accountId, period);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState<Currency | null>(null);
  const [editingDates, setEditingDates] = useState(false);
  const [datesForm, setDatesForm] = useState({ closingDate: "", dueDate: "" });
  const [datesError, setDatesError] = useState<string | null>(null);
  const [datesBusy, setDatesBusy] = useState(false);
  const [datesSaved, setDatesSaved] = useState(false);

  const back = { to: "/accounts", label: t("statements.back") };
  const base = `/accounts/${accountId}/statement`;
  const title = data.card ? displayName(data.card, t) : t("screens.statement.title");

  if (data.status === "error") {
    return (
      <>
        <ScreenHeader title={t("screens.statement.title")} back={back} />
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
  if (data.status === "loading") {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <p className="screen-note" role="status">
          {t("statements.loading")}
        </p>
      </>
    );
  }
  const card = data.card;
  if (card?.type !== "credit_card") {
    return (
      <>
        <ScreenHeader title={t("screens.statement.title")} back={back} />
        <EmptyState title={t("statements.notFound")} />
      </>
    );
  }
  const { detail, selected } = data;
  if (!detail || !selected) {
    return (
      <>
        <ScreenHeader title={title} back={back} />
        <EmptyState
          title={t("statements.noSchedule")}
          action={
            <Button variant="ghost" onClick={() => navigate(`/accounts/${card.id}/edit`)}>
              {t("statements.editCard")}
            </Button>
          }
        />
      </>
    );
  }

  const money = (minor: number, currency: Currency) => formatMoney(minor / 100, currency, locale);
  const held = CURRENCIES.filter((currency) => totalsFor(detail, currency));
  const primary: Currency = held.includes("ARS") ? "ARS" : (held[0] ?? "ARS");
  const secondaryCurrency: Currency = primary === "ARS" ? "USD" : "ARS";
  const primaryTotals = totalsFor(detail, primary);
  const secondaryTotals = totalsFor(detail, secondaryCurrency);
  const showSecondary = hasActivity(secondaryTotals);
  const query = `?period=${selected.periodMonth}`;

  const rowsOf = (currency: Currency) => {
    const totals = totalsFor(detail, currency);
    if (!totals) {
      return [];
    }
    const entries: [string, number][] = [
      ["previous", totals.previousBalanceMinor],
      ["own", totals.ownMinor],
      ["others", totals.othersMinor],
      ["charges", totals.chargesMinor],
      ["payments", totals.paymentsMinor],
    ];
    return entries.map(([key, minor]) => ({
      key: `${currency}-${key}`,
      label: t(`statements.lines.${key}`),
      value: money(minor, currency),
    }));
  };
  const sections = [
    { key: primary, heading: null, rows: rowsOf(primary) },
    ...(showSecondary
      ? [
          {
            key: secondaryCurrency,
            heading: t("statements.dollars"),
            rows: rowsOf(secondaryCurrency),
          },
        ]
      : []),
  ];

  const bankLines = held.flatMap((currency) => {
    const totals = totalsFor(detail, currency);
    if (!totals || totals.bankTotalMinor === null) {
      return [];
    }
    const difference = totals.differenceMinor ?? 0;
    return [
      {
        key: currency,
        text: t("statements.bankTotal", { amount: money(totals.bankTotalMinor, currency) }),
        status:
          difference === 0
            ? t("statements.noDifference")
            : t("statements.difference", { amount: money(Math.abs(difference), currency) }),
      },
    ];
  });

  async function adjust(current: StatementDetail, currency: Currency) {
    setBusy(currency);
    setFailure(null);
    const result = await adjustStatement(current.id, { currency });
    setBusy(null);
    if (result.ok) {
      data.reload();
      return;
    }
    setFailure(
      KNOWN_FAILURES.has(result.error)
        ? t(`statements.failures.${result.error}`)
        : t("statements.failures.saveFailed"),
    );
  }

  function openDates(current: StatementDetail) {
    setDatesForm({ closingDate: current.closingDate, dueDate: current.dueDate });
    setDatesError(null);
    setDatesSaved(false);
    setEditingDates(true);
  }

  async function saveDates(current: StatementDetail) {
    const built = buildDates(current.periodMonth, datesForm);
    if (!built.ok) {
      setDatesError(t(`statements.dates.failures.${built.error}`));
      return;
    }
    setDatesBusy(true);
    setDatesError(null);
    const result = await updateStatementDates(current.id, built.value);
    setDatesBusy(false);
    if (result.ok) {
      setEditingDates(false);
      setDatesSaved(true);
      data.reload();
      return;
    }
    setDatesError(
      DATES_FAILURES.has(result.error)
        ? t(`statements.dates.failures.${result.error}`)
        : t("statements.dates.failures.saveFailed"),
    );
  }

  const adjustments = held.flatMap((currency) => {
    const totals = totalsFor(detail, currency);
    const stale = adjustmentOf(detail, currency) > 0 && (totals?.differenceMinor ?? 0) < 0;
    const amount = positiveDifference(totals);
    if (amount === 0 && !stale) {
      return [];
    }
    return [
      {
        key: currency,
        label:
          busy === currency
            ? t("statements.adjusting")
            : amount === 0
              ? t("statements.removeAdjustment")
              : t("statements.adjust", { amount: money(amount, currency) }),
        busy: busy === currency,
        onClick: () => adjust(detail, currency),
      },
    ];
  });

  const names = new Map(data.accounts.map((account) => [account.id, displayName(account, t)]));
  const owed = owedByPerson(detail.others)
    .map((entry) =>
      t("statements.owes", {
        name: (entry.personId ? names.get(entry.personId) : undefined) ?? t("statements.someone"),
        amount: money(entry.amountMinor, entry.currency),
      }),
    )
    .join(", ");

  const chargeLabel = (line: StatementDetail["charges"][number]) =>
    line.description ?? (line.isAdjustment ? t("defaults.category.adjustment") : "");

  return (
    <StatementScreen
      title={title}
      back={back}
      periodsLabel={t("statements.periods")}
      periods={data.periods.map((item) => ({
        key: item.id,
        label: monthLabel(item.periodMonth, locale),
        selected: item.id === selected.id,
        onSelect: () => {
          setFailure(null);
          setEditingDates(false);
          setDatesError(null);
          setDatesSaved(false);
          navigate(`${base}?period=${item.periodMonth}`, { replace: true });
        },
      }))}
      caption={t("statements.closesDue", {
        closing: shortDate(detail.closingDate, locale),
        due: shortDate(detail.dueDate, locale),
      })}
      total={money(primaryTotals?.totalMinor ?? 0, primary)}
      secondary={
        showSecondary && secondaryTotals
          ? `+ ${money(secondaryTotals.totalMinor, secondaryCurrency)}`
          : null
      }
      sections={sections}
      bank={{
        lines: bankLines,
        missing: bankLines.length === 0 ? t("statements.bankMissing") : null,
      }}
      adjustments={adjustments}
      chargesTitle={t("statements.chargesTitle")}
      charges={detail.charges.map((line) => ({
        key: line.movementId,
        label: chargeLabel(line) || t("statements.chargesTitle"),
        value: money(line.amountMinor, line.currency),
        to: `${base}/charges/${line.movementId}${query}`,
      }))}
      note={owed ? t("statements.othersNote", { owed }) : null}
      failure={failure}
      success={datesSaved ? t("statements.dates.saved") : null}
      datesEditor={{
        openLabel: t("statements.dates.open"),
        open: editingDates,
        onOpen: () => openDates(detail),
        title: t("statements.dates.title"),
        lang: i18n.language,
        closing: {
          label: t("statements.dates.closing"),
          value: datesForm.closingDate,
          onChange: (closingDate) => setDatesForm((current) => ({ ...current, closingDate })),
        },
        due: {
          label: t("statements.dates.due"),
          value: datesForm.dueDate,
          onChange: (dueDate) => setDatesForm((current) => ({ ...current, dueDate })),
        },
        error: datesError,
        submit: {
          label: datesBusy ? t("statements.dates.saving") : t("statements.dates.save"),
          busy: datesBusy,
        },
        cancel: { label: t("statements.dates.cancel"), onCancel: () => setEditingDates(false) },
        onSubmit: () => saveDates(detail),
      }}
      actions={{
        addCharge: { to: `${base}/charge${query}`, label: t("statements.actions.addCharge") },
        reconcile: { to: `${base}/reconcile${query}`, label: t("statements.actions.reconcile") },
        pay: { to: `${base}/pay${query}`, label: t("statements.actions.pay") },
      }}
      editCard={{ to: `/accounts/${card.id}/edit`, label: t("statements.editCard") }}
    />
  );
}
