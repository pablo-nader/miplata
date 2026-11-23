import {
  type ChangesReport,
  type CommittedReport,
  type Currency,
  changesReportSchema,
  committedReportSchema,
  type MonthlyReport,
  monthlyReportSchema,
  type SpendingMovements,
  type SpendingReport,
  spendingMovementsSchema,
  spendingReportSchema,
  type YearMonth,
} from "@miplata/shared";

export type ReportFilters = {
  currency: Currency;
  accountId: string | null;
  categoryId: string | null;
};

type Parser<T> = { parse(value: unknown): T };

function search(params: Record<string, string | number | null>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null) {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

function filterParams(filters: ReportFilters) {
  return {
    currency: filters.currency,
    accountId: filters.accountId,
    categoryId: filters.categoryId,
  };
}

async function load<T>(
  path: string,
  params: Record<string, string | number | null>,
  schema: Parser<T>,
) {
  const response = await fetch(`/api/reports/${path}?${search(params)}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return schema.parse(await response.json());
}

export function fetchSpending(month: YearMonth, filters: ReportFilters): Promise<SpendingReport> {
  return load("spending", { month, ...filterParams(filters) }, spendingReportSchema);
}

export function fetchSpendingMovements(
  month: YearMonth,
  filters: ReportFilters,
  categoryId: string,
): Promise<SpendingMovements> {
  return load(
    "spending/movements",
    { month, ...filterParams({ ...filters, categoryId }) },
    spendingMovementsSchema,
  );
}

export function fetchMonthly(to: YearMonth, filters: ReportFilters): Promise<MonthlyReport> {
  return load("monthly", { to, ...filterParams(filters) }, monthlyReportSchema);
}

export function fetchChanges(month: YearMonth, filters: ReportFilters): Promise<ChangesReport> {
  return load("changes", { month, ...filterParams(filters) }, changesReportSchema);
}

export function fetchCommitted(
  from: YearMonth,
  months: number,
  filters: ReportFilters,
): Promise<CommittedReport> {
  return load("committed", { from, months, ...filterParams(filters) }, committedReportSchema);
}
