import type {
  Budget,
  BudgetProgressDto,
  BudgetRequest,
  BudgetsResponse,
  YearMonth,
} from "@miplata/shared";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { budgetProgress, budgetSpent } from "../domain/budget-progress";
import type { BudgetRepository } from "./budget-repository";

export type BudgetDependencies = {
  budgets: BudgetRepository;
  categories: CategoryRepository;
};

export type BudgetError = "category_not_found" | "group_not_found" | "budget_exists" | "not_found";

export type BudgetResult<T> = { ok: true; value: T } | { ok: false; error: BudgetError };

function failure<T>(error: BudgetError): BudgetResult<T> {
  return { ok: false, error };
}

async function checkTarget(
  deps: BudgetDependencies,
  userId: string,
  request: BudgetRequest,
): Promise<BudgetError | null> {
  if (request.categoryId) {
    const category = await deps.categories.findCategory(userId, request.categoryId);
    return category && category.type === "expense" ? null : "category_not_found";
  }
  const group = request.groupId ? await deps.categories.findGroup(userId, request.groupId) : null;
  return group ? null : "group_not_found";
}

export async function createBudget(
  deps: BudgetDependencies,
  userId: string,
  request: BudgetRequest,
): Promise<BudgetResult<Budget>> {
  const invalid = await checkTarget(deps, userId, request);
  if (invalid) {
    return failure(invalid);
  }
  const stored = await deps.budgets.insert(userId, request);
  return stored === "duplicate" ? failure("budget_exists") : { ok: true, value: stored };
}

export async function updateBudget(
  deps: BudgetDependencies,
  userId: string,
  budgetId: string,
  request: BudgetRequest,
): Promise<BudgetResult<Budget>> {
  const existing = await deps.budgets.find(userId, budgetId);
  if (!existing) {
    return failure("not_found");
  }
  const sameTarget =
    existing.categoryId === request.categoryId && existing.groupId === request.groupId;
  const invalid = sameTarget ? null : await checkTarget(deps, userId, request);
  if (invalid) {
    return failure(invalid);
  }
  const stored = await deps.budgets.replace(userId, budgetId, request);
  if (stored === "duplicate") {
    return failure("budget_exists");
  }
  return stored ? { ok: true, value: stored } : failure("not_found");
}

export async function deleteBudget(
  budgets: BudgetRepository,
  userId: string,
  budgetId: string,
): Promise<BudgetResult<null>> {
  return (await budgets.remove(userId, budgetId))
    ? { ok: true, value: null }
    : failure("not_found");
}

const SEVERITY = { reached: 0, warning: 1, below: 2 } as const;

export async function listBudgetProgress(
  deps: BudgetDependencies,
  userId: string,
  month: YearMonth,
  attentionOnly: boolean,
): Promise<BudgetsResponse> {
  const [budgets, rows, categories] = await Promise.all([
    deps.budgets.list(userId),
    deps.budgets.spentRows(userId, month),
    deps.categories.listCategories(userId),
  ]);
  const items = budgets.map((budget): BudgetProgressDto => {
    const categoryIds = budget.categoryId
      ? [budget.categoryId]
      : categories
          .filter((category) => category.type === "expense" && category.groupId === budget.groupId)
          .map((category) => category.id);
    const spent = budgetSpent(rows, { periodMonth: month, currency: budget.currency, categoryIds });
    return { ...budget, month, ...budgetProgress(budget.limitMinor, spent) };
  });
  if (!attentionOnly) {
    return { month, items };
  }
  const flagged = items
    .filter((item) => item.state !== "below")
    .sort((left, right) => SEVERITY[left.state] - SEVERITY[right.state]);
  return { month, items: flagged };
}
