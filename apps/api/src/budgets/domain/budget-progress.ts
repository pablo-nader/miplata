import type { Currency, YearMonth } from "@miplata/shared";

export type BudgetState = "below" | "warning" | "reached";

export type BudgetProgress = {
  limitMinor: number;
  spentMinor: number;
  remainingMinor: number;
  overspentMinor: number;
  state: BudgetState;
};

export type BudgetInstallment = {
  kind: "income" | "expense";
  periodMonth: YearMonth;
  currency: Currency;
  categoryId: string;
  ownAmountMinor: number;
};

export type BudgetFilter = {
  periodMonth: YearMonth;
  currency: Currency;
  categoryIds: readonly string[];
};

const WARNING_PERCENT = 80n;

function stateFor(limit: number, spent: number): BudgetState {
  if (spent >= limit) {
    return "reached";
  }
  return BigInt(spent) * 100n >= BigInt(limit) * WARNING_PERCENT ? "warning" : "below";
}

export function budgetProgress(limitMinor: number, spentMinor: number): BudgetProgress {
  if (!Number.isSafeInteger(limitMinor) || limitMinor < 1) {
    throw new RangeError(`Limit must be a positive integer: ${limitMinor}`);
  }
  if (!Number.isSafeInteger(spentMinor)) {
    throw new RangeError(`Spent must be an integer: ${spentMinor}`);
  }
  const spent = Math.max(0, spentMinor);
  return {
    limitMinor,
    spentMinor: spent,
    remainingMinor: Math.max(0, limitMinor - spent),
    overspentMinor: Math.max(0, spent - limitMinor),
    state: stateFor(limitMinor, spent),
  };
}

export function budgetSpent(
  installments: readonly BudgetInstallment[],
  filter: BudgetFilter,
): number {
  const categories = new Set(filter.categoryIds);
  return installments
    .filter(
      (item) =>
        item.kind === "expense" &&
        item.periodMonth === filter.periodMonth &&
        item.currency === filter.currency &&
        categories.has(item.categoryId),
    )
    .reduce((sum, item) => sum + item.ownAmountMinor, 0);
}
