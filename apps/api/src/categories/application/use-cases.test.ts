import type { CategoryDto, CategoryGroupDto } from "@miplata/shared";
import { describe, expect, it, vi } from "vitest";
import type { CategoryRepository } from "./category-repository";
import {
  createCategory,
  deleteCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from "./category-use-cases";
import { createGroup, deleteGroup, renameGroup } from "./group-use-cases";

const groupRow: CategoryGroupDto = { id: "g1", nameKey: null, name: "Home", sortOrder: 0 };
const expenseRow: CategoryDto = {
  id: "c1",
  type: "expense",
  groupId: "g1",
  nameKey: null,
  name: "Rent",
  icon: "key",
  color: 1,
  isActive: true,
  sortOrder: 0,
};
const incomeRow: CategoryDto = { ...expenseRow, id: "c2", type: "income", groupId: null };

function repositoryWith(overrides: Partial<CategoryRepository> = {}): CategoryRepository {
  return {
    listGroups: vi.fn(async () => [groupRow]),
    listCategories: vi.fn(async () => [expenseRow, incomeRow]),
    findCategory: vi.fn(async () => expenseRow),
    findGroup: vi.fn(async () => groupRow),
    insertCategory: vi.fn(async () => expenseRow),
    updateCategory: vi.fn(async () => expenseRow),
    setActive: vi.fn(async () => expenseRow),
    deleteCategory: vi.fn(async () => "deleted" as const),
    insertGroup: vi.fn(async () => groupRow),
    renameGroup: vi.fn(async () => groupRow),
    deleteGroup: vi.fn(async () => "deleted" as const),
    mostUsedCategoryIds: vi.fn(async () => []),
    ...overrides,
  };
}

describe("listCategories", () => {
  it("groups the user's rows into a catalog", async () => {
    // Arrange
    const repository = repositoryWith();

    // Act
    const catalog = await listCategories(repository, "u1");

    // Assert
    expect(catalog.expenseGroups[0]?.categories).toEqual([expenseRow]);
    expect(catalog.income).toEqual([incomeRow]);
    expect(repository.listGroups).toHaveBeenCalledWith("u1");
    expect(repository.listCategories).toHaveBeenCalledWith("u1");
  });
});

describe("createCategory", () => {
  const expense = { type: "expense", groupId: "g1", name: "Rent", icon: "key", color: 1 } as const;

  it("creates an expense category inside one of the user's groups", async () => {
    // Arrange
    const repository = repositoryWith();

    // Act
    const result = await createCategory(repository, "u1", expense);

    // Assert
    expect(result).toEqual({ ok: true, value: expenseRow });
    expect(repository.findGroup).toHaveBeenCalledWith("u1", "g1");
    expect(repository.insertCategory).toHaveBeenCalledWith("u1", {
      type: "expense",
      groupId: "g1",
      name: "Rent",
      icon: "key",
      color: 1,
    });
  });

  it("creates an income category without a group", async () => {
    // Arrange
    const repository = repositoryWith({ insertCategory: vi.fn(async () => incomeRow) });

    // Act
    const result = await createCategory(repository, "u1", {
      type: "income",
      name: "Prize",
      icon: null,
      color: 2,
    });

    // Assert
    expect(result).toEqual({ ok: true, value: incomeRow });
    expect(repository.findGroup).not.toHaveBeenCalled();
  });

  it("requires a group for an expense and forbids one for income", async () => {
    // Arrange
    const repository = repositoryWith();

    // Act
    const missing = await createCategory(repository, "u1", { ...expense, groupId: undefined });
    const extra = await createCategory(repository, "u1", { ...expense, type: "income" });

    // Assert
    expect(missing).toEqual({ ok: false, reason: "group_required" });
    expect(extra).toEqual({ ok: false, reason: "group_not_allowed" });
    expect(repository.insertCategory).not.toHaveBeenCalled();
  });

  it("rejects a group that is not the user's", async () => {
    // Arrange
    const repository = repositoryWith({ findGroup: vi.fn(async () => null) });

    // Act
    const result = await createCategory(repository, "u1", expense);

    // Assert
    expect(result).toEqual({ ok: false, reason: "group_not_found" });
    expect(repository.insertCategory).not.toHaveBeenCalled();
  });

  it("reports a taken name", async () => {
    // Arrange
    const repository = repositoryWith({ insertCategory: vi.fn(async () => "name_taken" as const) });

    // Act
    const result = await createCategory(repository, "u1", expense);

    // Assert
    expect(result).toEqual({ ok: false, reason: "name_taken" });
  });
});

describe("updateCategory", () => {
  it("applies the patch to an existing category", async () => {
    // Arrange
    const repository = repositoryWith();

    // Act
    const result = await updateCategory(repository, "u1", "c1", { name: "Lease" });

    // Assert
    expect(result).toEqual({ ok: true, value: expenseRow });
    expect(repository.updateCategory).toHaveBeenCalledWith("u1", "c1", { name: "Lease" });
  });

  it("answers not found when the category is missing before or during the update", async () => {
    // Arrange
    const missing = repositoryWith({ findCategory: vi.fn(async () => null) });
    const vanished = repositoryWith({ updateCategory: vi.fn(async () => null) });

    // Act
    const before = await updateCategory(missing, "u1", "c1", { color: 2 });
    const during = await updateCategory(vanished, "u1", "c1", { color: 2 });

    // Assert
    expect(before).toEqual({ ok: false, reason: "not_found" });
    expect(during).toEqual({ ok: false, reason: "not_found" });
  });

  it("moves an expense category to another of the user's groups", async () => {
    // Arrange
    const repository = repositoryWith();

    // Act
    const result = await updateCategory(repository, "u1", "c1", { groupId: "g2" });

    // Assert
    expect(result.ok).toBe(true);
    expect(repository.findGroup).toHaveBeenCalledWith("u1", "g2");
  });

  it("refuses to give an income category a group", async () => {
    // Arrange
    const repository = repositoryWith({ findCategory: vi.fn(async () => incomeRow) });

    // Act
    const result = await updateCategory(repository, "u1", "c2", { groupId: "g1" });

    // Assert
    expect(result).toEqual({ ok: false, reason: "group_not_allowed" });
  });

  it("refuses a target group that is not the user's", async () => {
    // Arrange
    const repository = repositoryWith({ findGroup: vi.fn(async () => null) });

    // Act
    const result = await updateCategory(repository, "u1", "c1", { groupId: "other" });

    // Assert
    expect(result).toEqual({ ok: false, reason: "group_not_found" });
  });

  it("reports a taken name", async () => {
    // Arrange
    const repository = repositoryWith({ updateCategory: vi.fn(async () => "name_taken" as const) });

    // Act
    const result = await updateCategory(repository, "u1", "c1", { name: "Dup" });

    // Assert
    expect(result).toEqual({ ok: false, reason: "name_taken" });
  });
});

describe("setCategoryActive", () => {
  it("deactivates and reactivates", async () => {
    // Arrange
    const repository = repositoryWith();

    // Act
    const off = await setCategoryActive(repository, "u1", "c1", false);
    const on = await setCategoryActive(repository, "u1", "c1", true);

    // Assert
    expect(off.ok && on.ok).toBe(true);
    expect(repository.setActive).toHaveBeenNthCalledWith(1, "u1", "c1", false);
    expect(repository.setActive).toHaveBeenNthCalledWith(2, "u1", "c1", true);
  });

  it("answers not found for a category that is not the user's", async () => {
    // Arrange
    const repository = repositoryWith({ setActive: vi.fn(async () => null) });

    // Act
    const result = await setCategoryActive(repository, "u1", "c1", false);

    // Assert
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("deleteCategory", () => {
  it.each([
    ["deleted", { ok: true, value: null }],
    ["not_found", { ok: false, reason: "not_found" }],
    ["in_use", { ok: false, reason: "in_use" }],
  ] as const)("maps %s", async (repositoryResult, expected) => {
    // Arrange
    const repository = repositoryWith({ deleteCategory: vi.fn(async () => repositoryResult) });

    // Act
    const result = await deleteCategory(repository, "u1", "c1");

    // Assert
    expect(result).toEqual(expected);
  });
});

describe("groups", () => {
  it("creates and renames a group", async () => {
    // Arrange
    const repository = repositoryWith();

    // Act
    const created = await createGroup(repository, "u1", "Home");
    const renamed = await renameGroup(repository, "u1", "g1", "House");

    // Assert
    expect(created).toEqual({ ok: true, value: groupRow });
    expect(renamed).toEqual({ ok: true, value: groupRow });
    expect(repository.renameGroup).toHaveBeenCalledWith("u1", "g1", "House");
  });

  it("reports a taken name and a missing group", async () => {
    // Arrange
    const taken = repositoryWith({
      insertGroup: vi.fn(async () => "name_taken" as const),
      renameGroup: vi.fn(async () => "name_taken" as const),
    });
    const missing = repositoryWith({ renameGroup: vi.fn(async () => null) });

    // Act
    const created = await createGroup(taken, "u1", "Home");
    const renamedTaken = await renameGroup(taken, "u1", "g1", "Home");
    const renamedMissing = await renameGroup(missing, "u1", "g1", "Home");

    // Assert
    expect(created).toEqual({ ok: false, reason: "name_taken" });
    expect(renamedTaken).toEqual({ ok: false, reason: "name_taken" });
    expect(renamedMissing).toEqual({ ok: false, reason: "not_found" });
  });

  it.each([
    ["deleted", { ok: true, value: null }],
    ["not_found", { ok: false, reason: "not_found" }],
    ["not_empty", { ok: false, reason: "not_empty" }],
  ] as const)("maps group deletion %s", async (repositoryResult, expected) => {
    // Arrange
    const repository = repositoryWith({ deleteGroup: vi.fn(async () => repositoryResult) });

    // Act
    const result = await deleteGroup(repository, "u1", "g1");

    // Assert
    expect(result).toEqual(expected);
  });
});
