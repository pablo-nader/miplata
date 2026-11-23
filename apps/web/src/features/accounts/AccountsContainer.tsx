import type { Account } from "@miplata/shared";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { type AccountRowData, type AccountSectionData, AccountsScreen } from "./AccountsScreen";
import {
  accountCaption,
  currencyBalances,
  displayName,
  SECTION_ORDER,
  sectionOf,
  typeRank,
} from "./account-display";
import { fetchAccounts } from "./accounts-api";

function rowFor(account: Account, t: ReturnType<typeof useTranslation>["t"], language: string) {
  const locale = localeForLanguage(language);
  const balances = currencyBalances(account);
  const [first, second] = balances;
  const primary = first ?? { currency: "ARS" as const, amount: 0 };
  const isPerson = account.type === "person";
  const owed = isPerson && primary.amount > 0;
  const shown = isPerson ? Math.abs(primary.amount) : primary.amount;
  const secondShown = second && isPerson ? Math.abs(second.amount) : second?.amount;
  const note = second
    ? formatMoney(secondShown ?? 0, second.currency, locale)
    : account.type === "credit_card" && primary.amount < 0
      ? t("accounts.debtNote")
      : undefined;
  const row: AccountRowData = {
    id: account.id,
    type: account.type,
    institution: account.institution,
    title: displayName(account, t),
    caption: accountCaption(account, t),
    amount: {
      amount: shown,
      currency: primary.currency,
      locale,
      direction: owed ? "income" : "neutral",
    },
    to:
      account.type === "credit_card"
        ? `/accounts/${account.id}/statement`
        : `/accounts/${account.id}/edit`,
    ...(note ? { note } : {}),
  };
  return row;
}

export function AccountsContainer() {
  const { t, i18n } = useTranslation();
  const { state, reload } = useResource(fetchAccounts);
  const accounts = state.status === "ready" ? state.data : [];

  const sections: AccountSectionData[] = SECTION_ORDER.map((section) => ({
    key: section,
    label: t(`accounts.sections.${section}`),
    rows: accounts
      .filter((account) => sectionOf(account) === section)
      .sort(
        (a, b) =>
          typeRank(a.type) - typeRank(b.type) || displayName(a, t).localeCompare(displayName(b, t)),
      )
      .map((account) => rowFor(account, t, i18n.language)),
    ...(section === "people"
      ? {
          add: { to: "/accounts/new?type=person", label: t("accounts.addPerson") },
          emptyNote: t("accounts.peopleEmpty"),
        }
      : {}),
  })).filter((section) => section.key === "people" || section.rows.length > 0);

  return (
    <AccountsScreen
      title={t("screens.accounts.title")}
      add={{ to: "/accounts/new", label: t("accounts.add") }}
      status={state.status}
      isEmpty={accounts.length === 0}
      sections={sections}
      messages={{
        loading: t("accounts.loading"),
        loadFailed: t("accounts.loadFailed"),
        retry: t("accounts.retry"),
        emptyTitle: t("accounts.emptyTitle"),
        emptyDescription: t("accounts.emptyDescription"),
      }}
      onRetry={reload}
    />
  );
}
