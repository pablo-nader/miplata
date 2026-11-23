import { CURRENCIES, type Currency, type MonthSummary } from "@miplata/shared";

export type MonthTotalRow = {
  currency: Currency;
  type: "income" | "expense";
  totalMinor: number;
};

export function monthTotals(rows: readonly MonthTotalRow[]): MonthSummary["totals"] {
  return CURRENCIES.map((currency) => {
    const sumOf = (type: MonthTotalRow["type"]) =>
      rows
        .filter((row) => row.currency === currency && row.type === type)
        .reduce((sum, row) => sum + row.totalMinor, 0);
    return { currency, inMinor: sumOf("income"), outMinor: sumOf("expense") };
  });
}
