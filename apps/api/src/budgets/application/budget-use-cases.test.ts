import type { CategoryDto, CategoryGroupDto } from "@miplata/shared";
import { beforeEach, describe, expect, it } from "vitest";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { inMemoryBudgets } from "../../test/budget-fakes";
import {
  type BudgetDependencies,
  createBudget,
  deleteBudget,
  listBudgetProgress,
  updateBudget,
} from "./budget-use-cases";

const GROUP = "00000000-0000-4000-8000-0000000000a1";
const FOOD = "00000000-0000-4000-8000-0000000000c1";
const SNACKS = "00000000-0000-4000-8000-0000000000c2";
const OTHER_GROUP_CATEGORY = "00000000-0000-4000-8000-0000000000c3";
const SALARY = "00000000-0000-4000-8000-0000000000c4";

function category(id: string, type: "expense" | "income", groupId: string | null): CategoryDto {
  return {
    id,
    type,
    groupId,
    nameKey: null,
    name: id,
    icon: null,
    color: 1,
    isActive: true,
    sortOrder: 0,
  };
}

const all = [
  category(FOOD, "expense", GROUP),
  category(SNACKS, "expense", GROUP),
  category(OTHER_GROUP_CATEGORY, "expense", "other-group"),
  category(SALARY, "income", null),
];

const categories = {
  findCategory: async (_userId: string, id: string) => all.find((item) => item.id === id) ?? null,
  findGroup: async (_userId: string, id: string): Promise<CategoryGroupDto | null> =>
    id === GROUP ? { id, nameKey: null, name: "Food", sortOrder: 0 } : null,
  listCategories: async () => all,
} as unknown as CategoryRepository;

let store: ReturnType<typeof inMemoryBudgets>;
let deps: BudgetDependencies;

const month = "2026-11";

function spend(categoryId: string, ownAmountMinor: number, currency: "ARS" | "USD" = "ARS") {
  store.addSpent("alice", {
    kind: "expense",
    periodMonth: month,
    currency,
    categoryId,
    ownAmountMinor,
  });
}

beforeEach(() => {
  store = inMemoryBudgets();
  deps = { budgets: store.repository, categories };
});

describe("createBudget", () => {
  it("creates a category budget and refuses a duplicate target and currency", async () => {
    // Arrange
    const request = { categoryId: FOOD, groupId: null, currency: "ARS" as const, limitMinor: 100 };

    // Act
    const first = await createBudget(deps, "alice", request);
    const second = await createBudget(deps, "alice", request);
    const otherCurrency = await createBudget(deps, "alice", { ...request, currency: "USD" });

    // Assert
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: "budget_exists" });
    expect(otherCurrency.ok).toBe(true);
  });

  it("refuses an income category and unknown targets", async () => {
    // Arrange
    const base = { currency: "ARS" as const, limitMinor: 100 };

    // Act
    const income = await createBudget(deps, "alice", {
      ...base,
      categoryId: SALARY,
      groupId: null,
    });
    const missing = await createBudget(deps, "alice", {
      ...base,
      categoryId: "00000000-0000-4000-8000-0000000000ff",
      groupId: null,
    });
    const group = await createBudget(deps, "alice", {
      ...base,
      categoryId: null,
      groupId: "00000000-0000-4000-8000-0000000000fe",
    });

    // Assert
    expect(income).toEqual({ ok: false, error: "category_not_found" });
    expect(missing).toEqual({ ok: false, error: "category_not_found" });
    expect(group).toEqual({ ok: false, error: "group_not_found" });
  });
});

describe("updateBudget and deleteBudget", () => {
  it("changes the limit, refuses a clash and reports unknown ids", async () => {
    // Arrange
    const food = await createBudget(deps, "alice", {
      categoryId: FOOD,
      groupId: null,
      currency: "ARS",
      limitMinor: 100,
    });
    await createBudget(deps, "alice", {
      categoryId: SNACKS,
      groupId: null,
      currency: "ARS",
      limitMinor: 100,
    });
    const id = food.ok ? food.value.id : "";

    // Act
    const raised = await updateBudget(deps, "alice", id, {
      categoryId: FOOD,
      groupId: null,
      currency: "ARS",
      limitMinor: 500,
    });
    const clash = await updateBudget(deps, "alice", id, {
      categoryId: SNACKS,
      groupId: null,
      currency: "ARS",
      limitMinor: 500,
    });
    const missing = await updateBudget(deps, "alice", "nope", {
      categoryId: FOOD,
      groupId: null,
      currency: "ARS",
      limitMinor: 1,
    });
    const removed = await deleteBudget(store.repository, "alice", id);
    const again = await deleteBudget(store.repository, "alice", id);

    // Assert
    expect(raised).toMatchObject({ ok: true, value: { limitMinor: 500 } });
    expect(clash).toEqual({ ok: false, error: "budget_exists" });
    expect(missing).toEqual({ ok: false, error: "not_found" });
    expect(removed.ok).toBe(true);
    expect(again).toEqual({ ok: false, error: "not_found" });
  });
});

describe("listBudgetProgress", () => {
  it("counts a group budget over its expense categories only", async () => {
    // Arrange
    await createBudget(deps, "alice", {
      categoryId: null,
      groupId: GROUP,
      currency: "ARS",
      limitMinor: 1000,
    });
    spend(FOOD, 300);
    spend(SNACKS, 500);
    spend(OTHER_GROUP_CATEGORY, 900);

    // Act
    const response = await listBudgetProgress(deps, "alice", month, false);

    // Assert
    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      spentMinor: 800,
      remainingMinor: 200,
      state: "warning",
    });
  });

  it("keeps each currency apart and starts every month from zero", async () => {
    // Arrange
    await createBudget(deps, "alice", {
      categoryId: FOOD,
      groupId: null,
      currency: "USD",
      limitMinor: 100,
    });
    spend(FOOD, 900, "ARS");
    spend(FOOD, 100, "USD");

    // Act
    const current = await listBudgetProgress(deps, "alice", month, false);
    const next = await listBudgetProgress(deps, "alice", "2026-12", false);

    // Assert
    expect(current.items[0]).toMatchObject({ spentMinor: 100, state: "reached" });
    expect(next.items[0]).toMatchObject({ spentMinor: 0, state: "below" });
  });

  it("lists only budgets near or over their limit, reached first", async () => {
    // Arrange
    await createBudget(deps, "alice", {
      categoryId: FOOD,
      groupId: null,
      currency: "ARS",
      limitMinor: 1000,
    });
    await createBudget(deps, "alice", {
      categoryId: SNACKS,
      groupId: null,
      currency: "ARS",
      limitMinor: 1000,
    });
    await createBudget(deps, "alice", {
      categoryId: null,
      groupId: GROUP,
      currency: "ARS",
      limitMinor: 100000,
    });
    spend(FOOD, 800);
    spend(SNACKS, 1000);

    // Act
    const response = await listBudgetProgress(deps, "alice", month, true);

    // Assert
    expect(response.items.map((item) => item.state)).toEqual(["reached", "warning"]);
  });
});
