import type { Budget, BudgetRequest, YearMonth } from "@miplata/shared";
import type { BudgetInstallment } from "../domain/budget-progress";

export type BudgetRepository = {
  list(userId: string): Promise<Budget[]>;
  find(userId: string, budgetId: string): Promise<Budget | null>;
  insert(userId: string, input: BudgetRequest): Promise<Budget | "duplicate">;
  replace(
    userId: string,
    budgetId: string,
    input: BudgetRequest,
  ): Promise<Budget | "duplicate" | null>;
  remove(userId: string, budgetId: string): Promise<boolean>;
  spentRows(userId: string, month: YearMonth): Promise<BudgetInstallment[]>;
};
