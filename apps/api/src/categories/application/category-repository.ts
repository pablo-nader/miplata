import type { CategoryDto, CategoryGroupDto, CategoryType } from "@miplata/shared";

export type NewCategory = {
  type: CategoryType;
  groupId: string | null;
  name: string;
  icon: string | null;
  color: number;
};

export type CategoryPatch = {
  name?: string | undefined;
  icon?: string | null | undefined;
  color?: number | undefined;
  groupId?: string | undefined;
};

export type CategoryRepository = {
  listGroups(userId: string): Promise<CategoryGroupDto[]>;
  listCategories(userId: string): Promise<CategoryDto[]>;
  findCategory(userId: string, categoryId: string): Promise<CategoryDto | null>;
  findGroup(userId: string, groupId: string): Promise<CategoryGroupDto | null>;
  insertCategory(userId: string, input: NewCategory): Promise<CategoryDto | "name_taken">;
  updateCategory(
    userId: string,
    categoryId: string,
    patch: CategoryPatch,
  ): Promise<CategoryDto | "name_taken" | null>;
  setActive(userId: string, categoryId: string, isActive: boolean): Promise<CategoryDto | null>;
  deleteCategory(userId: string, categoryId: string): Promise<"deleted" | "not_found" | "in_use">;
  insertGroup(userId: string, name: string): Promise<CategoryGroupDto | "name_taken">;
  renameGroup(
    userId: string,
    groupId: string,
    name: string,
  ): Promise<CategoryGroupDto | "name_taken" | null>;
  deleteGroup(userId: string, groupId: string): Promise<"deleted" | "not_found" | "not_empty">;
  mostUsedCategoryIds(
    userId: string,
    type: CategoryType,
    since: string,
    until: string,
    limit: number,
  ): Promise<string[]>;
};

export type Outcome<Value, Reason extends string> =
  | { ok: true; value: Value }
  | { ok: false; reason: Reason };

export function succeed<Value>(value: Value): { ok: true; value: Value } {
  return { ok: true, value };
}

export function fail<Reason extends string>(reason: Reason): { ok: false; reason: Reason } {
  return { ok: false, reason };
}
