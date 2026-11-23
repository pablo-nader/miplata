import { randomUUID } from "node:crypto";
import type { Budget } from "@miplata/shared";
import type { BudgetRepository } from "../budgets/application/budget-repository";
import type { BudgetInstallment } from "../budgets/domain/budget-progress";

type Stored = { userId: string; budget: Budget };

export function inMemoryBudgets() {
  const rows: Stored[] = [];
  const spent: { userId: string; item: BudgetInstallment }[] = [];

  const clash = (userId: string, input: Omit<Budget, "id" | "limitMinor">, ignore?: string) =>
    rows.some(
      ({ userId: owner, budget }) =>
        owner === userId &&
        budget.id !== ignore &&
        budget.currency === input.currency &&
        budget.categoryId === input.categoryId &&
        budget.groupId === input.groupId,
    );

  const repository: BudgetRepository = {
    async list(userId) {
      return rows.filter((row) => row.userId === userId).map((row) => row.budget);
    },
    async find(userId, budgetId) {
      return (
        rows.find((row) => row.userId === userId && row.budget.id === budgetId)?.budget ?? null
      );
    },
    async insert(userId, input) {
      if (clash(userId, input)) {
        return "duplicate";
      }
      const budget = { id: randomUUID(), ...input };
      rows.push({ userId, budget });
      return budget;
    },
    async replace(userId, budgetId, input) {
      const row = rows.find((item) => item.userId === userId && item.budget.id === budgetId);
      if (!row) {
        return null;
      }
      if (clash(userId, input, budgetId)) {
        return "duplicate";
      }
      row.budget = { id: budgetId, ...input };
      return row.budget;
    },
    async remove(userId, budgetId) {
      const index = rows.findIndex((row) => row.userId === userId && row.budget.id === budgetId);
      if (index < 0) {
        return false;
      }
      rows.splice(index, 1);
      return true;
    },
    async spentRows(userId, month) {
      return spent
        .filter((entry) => entry.userId === userId && entry.item.periodMonth === month)
        .map((entry) => entry.item);
    },
  };

  return {
    repository,
    addSpent(userId: string, item: BudgetInstallment) {
      spent.push({ userId, item });
    },
  };
}
