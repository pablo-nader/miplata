import type { Account, AccountType, BalanceLine, Currency } from "@miplata/shared";

const CURRENCY_ORDER: readonly Currency[] = ["ARS", "USD"];

const TYPE_RANK: Record<AccountType, number> = {
  bank: 0,
  wallet: 1,
  cash: 2,
  credit_card: 3,
  person: 4,
};

export function accountBalance(openingMinor: number, postedMinor: number): number {
  const total = openingMinor + postedMinor;
  if (!Number.isSafeInteger(total)) {
    throw new RangeError("Balance is outside the safe integer range");
  }
  return total;
}

function displayName(account: Account): string {
  return account.name ?? account.nameKey ?? "";
}

export function balanceLines(accounts: readonly Account[]): BalanceLine[] {
  return accounts
    .filter((account) => account.isActive)
    .flatMap((account) =>
      account.currencies.map((entry) => ({
        accountId: account.id,
        type: account.type,
        name: account.name,
        nameKey: account.nameKey,
        currency: entry.currency,
        balanceMinor: entry.balanceMinor,
        sortName: displayName(account),
      })),
    )
    .sort(
      (a, b) =>
        TYPE_RANK[a.type] - TYPE_RANK[b.type] ||
        a.sortName.localeCompare(b.sortName) ||
        a.accountId.localeCompare(b.accountId),
    )
    .map(({ sortName: _sortName, ...line }) => line);
}

export function balanceTotals(lines: readonly BalanceLine[]) {
  return CURRENCY_ORDER.map((currency) => {
    let total = 0n;
    for (const line of lines) {
      if (line.currency === currency) {
        total += BigInt(line.balanceMinor);
      }
    }
    if (total > BigInt(Number.MAX_SAFE_INTEGER) || total < -BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError("Total is outside the safe integer range");
    }
    return { currency, totalMinor: Number(total) };
  });
}
