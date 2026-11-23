import type { CategoryGroupDto } from "@miplata/shared";
import { type CategoryRepository, fail, type Outcome, succeed } from "./category-repository";

export async function createGroup(
  repository: CategoryRepository,
  userId: string,
  name: string,
): Promise<Outcome<CategoryGroupDto, "name_taken">> {
  const created = await repository.insertGroup(userId, name);
  return created === "name_taken" ? fail("name_taken") : succeed(created);
}

export async function renameGroup(
  repository: CategoryRepository,
  userId: string,
  groupId: string,
  name: string,
): Promise<Outcome<CategoryGroupDto, "not_found" | "name_taken">> {
  const renamed = await repository.renameGroup(userId, groupId, name);
  if (renamed === null) {
    return fail("not_found");
  }
  return renamed === "name_taken" ? fail("name_taken") : succeed(renamed);
}

export async function deleteGroup(
  repository: CategoryRepository,
  userId: string,
  groupId: string,
): Promise<Outcome<null, "not_found" | "not_empty">> {
  const result = await repository.deleteGroup(userId, groupId);
  return result === "deleted" ? succeed(null) : fail(result);
}
