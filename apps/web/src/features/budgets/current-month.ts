import type { YearMonth } from "@miplata/shared";

export function currentMonth(now: Date = new Date()): YearMonth {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}
