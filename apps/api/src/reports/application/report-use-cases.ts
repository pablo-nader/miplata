import {
  addMonths,
  type ChangesQuery,
  type ChangesReport,
  type CommittedQuery,
  type CommittedReport,
  type MonthlyQuery,
  type MonthlyReport,
  type SpendingMovements,
  type SpendingMovementsQuery,
  type SpendingQuery,
  type SpendingReport,
  type YearMonth,
} from "@miplata/shared";
import {
  changesReport,
  committedReport,
  monthlyReport,
  spendingReport,
} from "../domain/report-aggregation";
import type { ReportRepository, TotalsFilter } from "./report-repository";

export type RecurringCommitments = {
  pendingByMonth(userId: string, filter: TotalsFilter): Promise<Map<YearMonth, number>>;
};

export type ReportDependencies = {
  reports: ReportRepository;
  recurring?: RecurringCommitments | undefined;
};

type Filters = {
  currency: TotalsFilter["currency"];
  accountId?: string | undefined;
  categoryId?: string | undefined;
};

function window(query: Filters, from: YearMonth, to: YearMonth): TotalsFilter {
  return {
    from,
    to,
    currency: query.currency,
    accountId: query.accountId,
    categoryId: query.categoryId,
  };
}

export async function getSpending(
  deps: ReportDependencies,
  userId: string,
  query: SpendingQuery,
): Promise<SpendingReport> {
  const rows = await deps.reports.totals(userId, window(query, query.month, query.month));
  return spendingReport(rows, query.month, query.currency);
}

export function getSpendingMovements(
  deps: ReportDependencies,
  userId: string,
  query: SpendingMovementsQuery,
): Promise<SpendingMovements["items"]> {
  return deps.reports.spendingMovements(userId, query);
}

export async function getMonthly(
  deps: ReportDependencies,
  userId: string,
  query: MonthlyQuery,
): Promise<MonthlyReport> {
  const rows = await deps.reports.totals(userId, window(query, addMonths(query.to, -11), query.to));
  return monthlyReport(rows, query.to, query.currency);
}

export async function getChanges(
  deps: ReportDependencies,
  userId: string,
  query: ChangesQuery,
): Promise<ChangesReport> {
  const rows = await deps.reports.totals(
    userId,
    window(query, addMonths(query.month, -3), query.month),
  );
  return changesReport(rows, query.month, query.currency);
}

export async function getCommitted(
  deps: ReportDependencies,
  userId: string,
  query: CommittedQuery,
): Promise<CommittedReport> {
  const filter = window(query, query.from, addMonths(query.from, query.months - 1));
  const rows = await deps.reports.totals(userId, filter);
  const recurring = deps.recurring
    ? await deps.recurring.pendingByMonth(userId, filter)
    : new Map<YearMonth, number>();
  return committedReport(rows, recurring, query.from, query.months, query.currency);
}
