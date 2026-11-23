import type { LoanPerson, LoanTotal } from "@miplata/shared";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney, localeForLanguage, type MoneyLocale } from "../../ui/format/money";
import { type LoanGroup, type LoanPersonRow, LoansScreen } from "./LoansScreen";
import { fetchLoans } from "./loans-api";
import { DIRECTIONS, type LoanDirection } from "./loans-view";

function totalsText(totals: readonly LoanTotal[], locale: MoneyLocale): string {
  return totals
    .map((total) => formatMoney(total.amountMinor / 100, total.currency, locale))
    .join(" · ");
}

function rowFor(
  person: LoanPerson,
  direction: LoanDirection,
  t: TFunction,
  locale: MoneyLocale,
): LoanPersonRow {
  return {
    id: person.personId,
    name: person.name ?? "",
    caption: t(direction === "owesYou" ? "loans.personOwesYou" : "loans.personYouOwe"),
    to: `/loans/${person.personId}`,
    lines: person.lines.map((line) => ({
      key: line.currency,
      amount: {
        amount: line.amountMinor / 100,
        currency: line.currency,
        locale,
        direction: direction === "owesYou" ? "income" : "neutral",
      },
      details: [
        ...(line.dueNowMinor > 0
          ? [
              t("loans.dueNow", {
                amount: formatMoney(line.dueNowMinor / 100, line.currency, locale),
              }),
            ]
          : []),
        ...(line.pendingTotalMinor > 0
          ? [
              t("loans.pendingTotal", {
                amount: formatMoney(line.pendingTotalMinor / 100, line.currency, locale),
              }),
            ]
          : []),
      ],
    })),
  };
}

export function LoansContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const { state, reload } = useResource(fetchLoans);
  const data = state.status === "ready" ? state.data : null;

  const groups: LoanGroup[] = DIRECTIONS.map((direction) => {
    const people = data?.[direction] ?? [];
    const totals = (direction === "owesYou" ? data?.owedToYouTotals : data?.youOweTotals) ?? [];
    return {
      key: direction,
      label: t(`loans.${direction}`),
      totals: totals.length > 0 ? totalsText(totals, locale) : "",
      empty: t(direction === "owesYou" ? "loans.emptyOwesYou" : "loans.emptyYouOwe"),
      rows: people.map((person) => rowFor(person, direction, t, locale)),
    };
  });

  return (
    <LoansScreen
      title={t("screens.loans.title")}
      back={{ to: "/accounts", label: t("loans.back") }}
      status={state.status}
      groups={groups}
      messages={{
        loading: t("loans.loading"),
        loadFailed: t("loans.loadFailed"),
        retry: t("loans.retry"),
      }}
      onRetry={reload}
    />
  );
}
