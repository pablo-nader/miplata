import type {
  CategoriesResponse,
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@miplata/shared";
import { buildCatalog, checkPlacement } from "../domain/catalog";
import { type CategoryRepository, fail, type Outcome, succeed } from "./category-repository";

export async function listCategories(
  repository: CategoryRepository,
  userId: string,
): Promise<CategoriesResponse> {
  const [groups, categories] = await Promise.all([
    repository.listGroups(userId),
    repository.listCategories(userId),
  ]);
  return buildCatalog(groups, categories);
}

export async function createCategory(
  repository: CategoryRepository,
  userId: string,
  request: CreateCategoryRequest,
): Promise<
  Outcome<CategoryDto, "group_required" | "group_not_allowed" | "group_not_found" | "name_taken">
> {
  const placement = checkPlacement(request.type, request.groupId);
  if (placement !== "valid") {
    return fail(placement);
  }
  if (request.groupId !== undefined && !(await repository.findGroup(userId, request.groupId))) {
    return fail("group_not_found");
  }
  const created = await repository.insertCategory(userId, {
    type: request.type,
    groupId: request.groupId ?? null,
    name: request.name,
    icon: request.icon,
    color: request.color,
  });
  return created === "name_taken" ? fail("name_taken") : succeed(created);
}

export async function updateCategory(
  repository: CategoryRepository,
  userId: string,
  categoryId: string,
  request: UpdateCategoryRequest,
): Promise<
  Outcome<CategoryDto, "not_found" | "group_not_allowed" | "group_not_found" | "name_taken">
> {
  const current = await repository.findCategory(userId, categoryId);
  if (!current) {
    return fail("not_found");
  }
  if (request.groupId !== undefined) {
    if (current.type !== "expense") {
      return fail("group_not_allowed");
    }
    if (!(await repository.findGroup(userId, request.groupId))) {
      return fail("group_not_found");
    }
  }
  const updated = await repository.updateCategory(userId, categoryId, request);
  if (updated === null) {
    return fail("not_found");
  }
  return updated === "name_taken" ? fail("name_taken") : succeed(updated);
}

export async function setCategoryActive(
  repository: CategoryRepository,
  userId: string,
  categoryId: string,
  isActive: boolean,
): Promise<Outcome<CategoryDto, "not_found">> {
  const updated = await repository.setActive(userId, categoryId, isActive);
  return updated ? succeed(updated) : fail("not_found");
}

export async function deleteCategory(
  repository: CategoryRepository,
  userId: string,
  categoryId: string,
): Promise<Outcome<null, "not_found" | "in_use">> {
  const result = await repository.deleteCategory(userId, categoryId);
  return result === "deleted" ? succeed(null) : fail(result);
}
