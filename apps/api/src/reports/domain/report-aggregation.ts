import {
  addMonths,
  type ChangesReport,
  type CommittedReport,
  type Currency,
  divideRounded,
  type MonthlyReport,
  monthsBetween,
  type SpendingReport,
  sumMinorUnits,
  type YearMonth,
} from "@miplata/shared";
import { monthlyInOut, percentChangeVsPreviousThree } from "./report-helpers";

export type TotalRow = {
  month: YearMonth;
  type: "income" | "expense";
  categoryId: string;
  groupId: string | null;
  totalMinor: number;
};

export function sharePercent(partMinor: number, totalMinor: number): number {
  if (totalMinor <= 0) {
    return 0;
  }
  return Number(divideRounded(BigInt(partMinor) * 1000n, BigInt(totalMinor), "half-up")) / 10 + 0;
}

function sumBy<T>(items: readonly T[], amount: (item: T) => number): number {
  return sumMinorUnits(items.map(amount));
}

export function spendingReport(
  rows: readonly TotalRow[],
  month: YearMonth,
  currency: Currency,
): SpendingReport {
  const expenses = rows.filter(
    (row) => row.type === "expense" && row.month === month && row.totalMinor > 0,
  );
  const totalMinor = sumBy(expenses, (row) => row.totalMinor);
  const byGroup = new Map<string | null, TotalRow[]>();
  for (const row of expenses) {
    byGroup.set(row.groupId, [...(byGroup.get(row.groupId) ?? []), row]);
  }
  const groups = [...byGroup.entries()]
    .map(([groupId, items]) => {
      const groupTotal = sumBy(items, (row) => row.totalMinor);
      const categories = items
        .map((row) => ({
          categoryId: row.categoryId,
          totalMinor: row.totalMinor,
          sharePercent: sharePercent(row.totalMinor, groupTotal),
        }))
        .sort((a, b) => b.totalMinor - a.totalMinor || a.categoryId.localeCompare(b.categoryId));
      return {
        groupId,
        totalMinor: groupTotal,
        sharePercent: sharePercent(groupTotal, totalMinor),
        categories,
      };
    })
    .sort(
      (a, b) => b.totalMinor - a.totalMinor || (a.groupId ?? "").localeCompare(b.groupId ?? ""),
    );
  return { month, currency, totalMinor, groups };
}

export function monthlyReport(
  rows: readonly TotalRow[],
  to: YearMonth,
  currency: Currency,
): MonthlyReport {
  const installments = rows.map((row) => ({
    kind: row.type,
    periodMonth: row.month,
    currency,
    ownAmountMinor: row.totalMinor,
  }));
  return {
    currency,
    months: monthlyInOut(installments, { from: addMonths(to, -11), to, currency }),
  };
}

export function changesReport(
  rows: readonly TotalRow[],
  month: YearMonth,
  currency: Currency,
): ChangesReport {
  const expenses = rows.filter((row) => row.type === "expense");
  const previousMonths = [-3, -2, -1].map((offset) => addMonths(month, offset));
  const categoryIds = [...new Set(expenses.map((row) => row.categoryId))];
  const totalOf = (categoryId: string, target: YearMonth) =>
    Math.max(
      0,
      sumBy(
        expenses.filter((row) => row.categoryId === categoryId && row.month === target),
        (row) => row.totalMinor,
      ),
    );
  const categories = categoryIds
    .map((categoryId) => {
      const currentMinor = totalOf(categoryId, month);
      const previous = previousMonths.map((target) => totalOf(categoryId, target));
      return {
        categoryId,
        currentMinor,
        previousAverageMinor: Math.round(sumMinorUnits(previous) / 3),
        percentChange: percentChangeVsPreviousThree(currentMinor, previous),
      };
    })
    .filter((entry) => entry.currentMinor > 0 || entry.previousAverageMinor > 0)
    .sort((a, b) => b.currentMinor - a.currentMinor || a.categoryId.localeCompare(b.categoryId));
  return { month, currency, categories };
}

export function committedReport(
  installmentRows: readonly TotalRow[],
  recurringByMonth: ReadonlyMap<YearMonth, number>,
  from: YearMonth,
  months: number,
  currency: Currency,
): CommittedReport {
  return {
    currency,
    months: monthsBetween(from, addMonths(from, months - 1)).map((month) => {
      const installmentsMinor = sumBy(
        installmentRows.filter((row) => row.type === "expense" && row.month === month),
        (row) => row.totalMinor,
      );
      const recurringMinor = recurringByMonth.get(month) ?? 0;
      return {
        month,
        installmentsMinor,
        recurringMinor,
        totalMinor: installmentsMinor + recurringMinor,
      };
    }),
  };
}
