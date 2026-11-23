import type { Account, Currency, LoanLine, LoanPerson, LoansResponse } from "@miplata/shared";

export type PendingShareRow = {
  personId: string;
  currency: Currency;
  dueNowMinor: number;
  totalMinor: number;
};

const CURRENCY_ORDER: readonly Currency[] = ["ARS", "USD"];

function sortName(person: Account): string {
  return person.name ?? person.nameKey ?? "";
}

function pendingFor(rows: readonly PendingShareRow[], personId: string, currency: Currency) {
  const row = rows.find((entry) => entry.personId === personId && entry.currency === currency);
  return { dueNowMinor: row?.dueNowMinor ?? 0, pendingTotalMinor: row?.totalMinor ?? 0 };
}

export function loanLines(
  person: Account,
  pending: readonly PendingShareRow[],
  direction: "owesYou" | "youOwe",
): LoanLine[] {
  return CURRENCY_ORDER.flatMap((currency) => {
    const entry = person.currencies.find((item) => item.currency === currency);
    const balance = entry?.balanceMinor ?? 0;
    const amountMinor = direction === "owesYou" ? balance : -balance;
    if (amountMinor <= 0) {
      return [];
    }
    const shares =
      direction === "owesYou"
        ? pendingFor(pending, person.id, currency)
        : { dueNowMinor: 0, pendingTotalMinor: 0 };
    return [{ currency, amountMinor, ...shares }];
  });
}

function group(
  people: readonly Account[],
  pending: readonly PendingShareRow[],
  direction: "owesYou" | "youOwe",
): LoanPerson[] {
  return people
    .map((person) => ({
      personId: person.id,
      name: person.name,
      isActive: person.isActive,
      lines: loanLines(person, pending, direction),
    }))
    .filter((entry) => entry.lines.length > 0)
    .sort((a, b) => {
      const left = people.find((person) => person.id === a.personId) as Account;
      const right = people.find((person) => person.id === b.personId) as Account;
      return sortName(left).localeCompare(sortName(right)) || a.personId.localeCompare(b.personId);
    });
}

function totals(entries: readonly LoanPerson[]) {
  return CURRENCY_ORDER.flatMap((currency) => {
    const amountMinor = entries
      .flatMap((entry) => entry.lines)
      .filter((line) => line.currency === currency)
      .reduce((sum, line) => sum + line.amountMinor, 0);
    if (!Number.isSafeInteger(amountMinor)) {
      throw new RangeError("Total is outside the safe integer range");
    }
    return amountMinor > 0 ? [{ currency, amountMinor }] : [];
  });
}

export function summarizeLoans(
  people: readonly Account[],
  pending: readonly PendingShareRow[],
): LoansResponse {
  const owesYou = group(people, pending, "owesYou");
  const youOwe = group(people, pending, "youOwe");
  return {
    owesYou,
    youOwe,
    owedToYouTotals: totals(owesYou),
    youOweTotals: totals(youOwe),
  };
}

export function repaymentSplit(balanceMinor: number, amountMinor: number) {
  if (balanceMinor <= 0 || amountMinor <= balanceMinor) {
    return { settleMinor: amountMinor, excessMinor: 0 };
  }
  return { settleMinor: balanceMinor, excessMinor: amountMinor - balanceMinor };
}
