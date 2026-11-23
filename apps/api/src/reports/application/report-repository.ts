import type { Currency, SpendingMovements, YearMonth } from "@miplata/shared";
import type { TotalRow } from "../domain/report-aggregation";

export type TotalsFilter = {
  from: YearMonth;
  to: YearMonth;
  currency: Currency;
  accountId?: string | undefined;
  categoryId?: string | undefined;
};

export type MovementsFilter = {
  month: YearMonth;
  currency: Currency;
  categoryId: string;
  accountId?: string | undefined;
};

export type ReportRepository = {
  totals(userId: string, filter: TotalsFilter): Promise<TotalRow[]>;
  spendingMovements(userId: string, filter: MovementsFilter): Promise<SpendingMovements["items"]>;
};
