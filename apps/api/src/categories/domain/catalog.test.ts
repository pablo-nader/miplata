import type { CategoryDto, CategoryGroupDto } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { buildCatalog, checkPlacement, nextSortOrder } from "./catalog";

function group(id: string, sortOrder: number): CategoryGroupDto {
  return { id, nameKey: null, name: id, sortOrder };
}

function category(
  id: string,
  type: "expense" | "income",
  groupId: string | null,
  sortOrder: number,
): CategoryDto {
  return {
    id,
    type,
    groupId,
    nameKey: null,
    name: id,
    icon: null,
    color: 1,
    isActive: true,
    sortOrder,
  };
}

describe("checkPlacement", () => {
  it.each([
    ["expense", "g1", "valid"],
    ["expense", undefined, "group_required"],
    ["income", undefined, "valid"],
    ["income", "g1", "group_not_allowed"],
  ] as const)("%s with group %s is %s", (type, groupId, expected) => {
    // Arrange
    const input = { type, groupId };

    // Act
    const placement = checkPlacement(input.type, input.groupId);

    // Assert
    expect(placement).toBe(expected);
  });
});

describe("buildCatalog", () => {
  it("nests expense categories under their group, ordered, and lists income apart", () => {
    // Arrange
    const groups = [group("b", 1), group("a", 0), group("empty", 2)];
    const categories = [
      category("b2", "expense", "b", 1),
      category("b1", "expense", "b", 0),
      category("a1", "expense", "a", 0),
      category("i2", "income", null, 1),
      category("i1", "income", null, 0),
    ];

    // Act
    const catalog = buildCatalog(groups, categories);

    // Assert
    expect(catalog.expenseGroups.map((item) => item.id)).toEqual(["a", "b", "empty"]);
    expect(catalog.expenseGroups.map((item) => item.categories.map((c) => c.id))).toEqual([
      ["a1"],
      ["b1", "b2"],
      [],
    ]);
    expect(catalog.income.map((item) => item.id)).toEqual(["i1", "i2"]);
  });

  it("breaks sort order ties by id so the order is stable", () => {
    // Arrange
    const groups = [group("z", 0), group("m", 0)];

    // Act
    const catalog = buildCatalog(groups, []);

    // Assert
    expect(catalog.expenseGroups.map((item) => item.id)).toEqual(["m", "z"]);
  });

  it("returns empty lists when there is nothing", () => {
    // Arrange
    const none: CategoryGroupDto[] = [];

    // Act
    const catalog = buildCatalog(none, []);

    // Assert
    expect(catalog).toEqual({ expenseGroups: [], income: [] });
  });
});

describe("nextSortOrder", () => {
  it("starts at zero and then goes after the highest", () => {
    // Arrange
    const empty: number[] = [];
    const used = [3, 0, 7];

    // Act
    const results = [nextSortOrder(empty), nextSortOrder(used)];

    // Assert
    expect(results).toEqual([0, 8]);
  });
});
