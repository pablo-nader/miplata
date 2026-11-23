import type { Movement, MovementQuery, YearMonth } from "@miplata/shared";
import type { PendingShareRow } from "../../loans/domain/loan-summary";
import type { StatementOverrides } from "../../statements/domain/statement-assignment";
import type { MonthTotalRow } from "../domain/month-summary";
import type { MovementPlan } from "../domain/movement-plan";

export type MovementPage = { items: Movement[]; hasMore: boolean };

export type RemoveOutcome = "deleted" | "not_found" | "in_use";

export type MovementRepository = {
  statementOverrides(
    userId: string,
    accountId: string,
    fromMonth: YearMonth,
    toMonth: YearMonth,
  ): Promise<StatementOverrides>;
  create(userId: string, plan: MovementPlan): Promise<Movement>;
  createAll(userId: string, plans: MovementPlan[]): Promise<Movement[]>;
  isStatementBound(userId: string, movementId: string): Promise<boolean>;
  replace(
    userId: string,
    movementId: string,
    plan: MovementPlan,
    alsoRemove?: string[],
  ): Promise<Movement | null>;
  createForOccurrence(
    userId: string,
    occurrenceId: string,
    plan: MovementPlan,
  ): Promise<Movement | "not_pending">;
  find(userId: string, movementId: string): Promise<Movement | null>;
  list(userId: string, query: MovementQuery): Promise<MovementPage>;
  remove(userId: string, movementId: string): Promise<RemoveOutcome>;
  monthRows(userId: string, month: YearMonth): Promise<MonthTotalRow[]>;
  pendingPersonShares(userId: string, month: YearMonth): Promise<PendingShareRow[]>;
};
