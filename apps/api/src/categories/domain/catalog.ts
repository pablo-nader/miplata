import type {
  CategoriesResponse,
  CategoryDto,
  CategoryGroupDto,
  CategoryType,
} from "@miplata/shared";

export type Placement = "valid" | "group_required" | "group_not_allowed";

export function checkPlacement(type: CategoryType, groupId: string | undefined): Placement {
  if (type === "expense") {
    return groupId === undefined ? "group_required" : "valid";
  }
  return groupId === undefined ? "valid" : "group_not_allowed";
}

function bySortOrder<T extends { sortOrder: number; id: string }>(left: T, right: T): number {
  return left.sortOrder - right.sortOrder || left.id.localeCompare(right.id);
}

export function buildCatalog(
  groups: readonly CategoryGroupDto[],
  categories: readonly CategoryDto[],
): CategoriesResponse {
  const expense = categories.filter((item) => item.type === "expense");
  return {
    expenseGroups: [...groups].sort(bySortOrder).map((group) => ({
      ...group,
      categories: expense.filter((item) => item.groupId === group.id).sort(bySortOrder),
    })),
    income: categories.filter((item) => item.type === "income").sort(bySortOrder),
  };
}

export function nextSortOrder(existing: readonly number[]): number {
  return existing.length === 0 ? 0 : Math.max(...existing) + 1;
}
