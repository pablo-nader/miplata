import type { ReportRepository } from "../reports/application/report-repository";
import type { TotalRow } from "../reports/domain/report-aggregation";

export function emptyReports(): ReportRepository {
  return {
    async totals() {
      return [];
    },
    async spendingMovements() {
      return [];
    },
  };
}

export type ReportCall = { userId: string; filter: unknown };

export function recordingReports(rows: TotalRow[]) {
  const calls: ReportCall[] = [];
  const repository: ReportRepository = {
    async totals(userId, filter) {
      calls.push({ userId, filter });
      return rows;
    },
    async spendingMovements(userId, filter) {
      calls.push({ userId, filter });
      return [];
    },
  };
  return { repository, calls };
}
