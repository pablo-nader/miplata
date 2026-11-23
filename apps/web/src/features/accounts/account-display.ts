import type { Account, AccountType, BalanceLine, Currency } from "@miplata/shared";
import type { TFunction } from "i18next";

export type CurrencyBalance = { currency: Currency; amount: number };

export function minorToUnits(minor: number): number {
  return minor / 100;
}

export function displayName(
  account: Pick<Account, "name" | "nameKey"> | Pick<BalanceLine, "name" | "nameKey">,
  t: TFunction,
): string {
  if (account.name) {
    return account.name;
  }
  return account.nameKey ? t(account.nameKey) : "";
}

export function currencyBalances(account: Account): CurrencyBalance[] {
  return account.currencies.map((entry) => ({
    currency: entry.currency,
    amount: minorToUnits(entry.balanceMinor),
  }));
}

export function currencySummary(account: Account, t: TFunction): string | null {
  const currencies = account.currencies.map((entry) => entry.currency);
  if (currencies.length === 2) {
    return t("accounts.bothCurrencies");
  }
  return currencies[0] === "USD" ? t("accounts.currencyNames.USD") : null;
}

export function personCaption(balances: readonly CurrencyBalance[], t: TFunction): string {
  const owed = balances.some((entry) => entry.amount > 0);
  const owing = balances.some((entry) => entry.amount < 0);
  if (owed && owing) {
    return t("accounts.bothWays");
  }
  if (owed) {
    return t("accounts.owesYou");
  }
  return owing ? t("accounts.youOwe") : t("accounts.settled");
}

export function accountCaption(account: Account, t: TFunction): string {
  if (account.type === "person") {
    return personCaption(currencyBalances(account), t);
  }
  if (account.type === "credit_card") {
    return account.closingDay && account.dueDay
      ? t("accounts.cardDays", { closing: account.closingDay, due: account.dueDay })
      : t("accounts.types.credit_card");
  }
  const summary = currencySummary(account, t);
  const label = t(`accounts.types.${account.type}`);
  return summary ? `${label} · ${summary}` : label;
}

export type AccountSection = "money" | "cards" | "people" | "inactive";

export function sectionOf(account: Account): AccountSection {
  if (!account.isActive) {
    return "inactive";
  }
  if (account.type === "credit_card") {
    return "cards";
  }
  return account.type === "person" ? "people" : "money";
}

export const SECTION_ORDER: readonly AccountSection[] = ["money", "cards", "people", "inactive"];

const TYPE_ORDER: Record<AccountType, number> = {
  bank: 0,
  wallet: 1,
  cash: 2,
  credit_card: 3,
  person: 4,
};

export function typeRank(type: AccountType): number {
  return TYPE_ORDER[type];
}
