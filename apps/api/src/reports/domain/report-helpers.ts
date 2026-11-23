import { type Currency, monthsBetween, type YearMonth } from "@miplata/shared";

export type ReportInstallment = {
  kind: "income" | "expense";
  periodMonth: YearMonth;
  currency: Currency;
  ownAmountMinor: number;
};

export type MonthRange = {
  from: YearMonth;
  to: YearMonth;
  currency: Currency;
};

export type MonthlyInOut = {
  month: YearMonth;
  inMinor: number;
  outMinor: number;
  resultMinor: number;
};

const PREVIOUS_MONTHS = 3;

export function percentChangeVsPreviousThree(
  currentMinor: number,
  previousMinor: readonly number[],
): number | null {
  if (previousMinor.length !== PREVIOUS_MONTHS) {
    throw new RangeError(`Exactly ${PREVIOUS_MONTHS} previous months are required`);
  }
  for (const value of [currentMinor, ...previousMinor]) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`Amount must be an integer of minor units: ${value}`);
    }
  }
  const sum = previousMinor.reduce((total, value) => total + value, 0);
  if (sum === 0) {
    return null;
  }
  const percent = ((PREVIOUS_MONTHS * currentMinor - sum) / sum) * 100;
  return Math.round(percent * 10) / 10 + 0;
}

export function monthlyInOut(
  installments: readonly ReportInstallment[],
  range: MonthRange,
): MonthlyInOut[] {
  return monthsBetween(range.from, range.to).map((month) => {
    const rows = installments.filter(
      (item) => item.periodMonth === month && item.currency === range.currency,
    );
    const total = (kind: ReportInstallment["kind"]) =>
      rows.filter((item) => item.kind === kind).reduce((sum, item) => sum + item.ownAmountMinor, 0);
    const inMinor = total("income");
    const outMinor = total("expense");
    return { month, inMinor, outMinor, resultMinor: inMinor - outMinor };
  });
}
