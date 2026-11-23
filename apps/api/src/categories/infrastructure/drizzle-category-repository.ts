import { and, asc, category, categoryGroup, type Database, eq, ne, sql } from "@miplata/db";
import { type CategoryDto, type CategoryGroupDto, categoryTypeSchema } from "@miplata/shared";
import {
  FOREIGN_KEY_VIOLATION,
  pgErrorCode,
  UNIQUE_VIOLATION,
} from "../../shared/database/pg-error";
import type { CategoryRepository } from "../application/category-repository";
import { nextSortOrder } from "../domain/catalog";

type CategoryRow = typeof category.$inferSelect;
type GroupRow = typeof categoryGroup.$inferSelect;

function toCategory(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    type: categoryTypeSchema.parse(row.type),
    groupId: row.groupId,
    nameKey: row.nameKey,
    name: row.name,
    icon: row.icon,
    color: row.color,
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

function toGroup(row: GroupRow): CategoryGroupDto {
  return { id: row.id, nameKey: row.nameKey, name: row.name, sortOrder: row.sortOrder };
}

function sameName(column: typeof category.name | typeof categoryGroup.name, name: string) {
  return sql`lower(${column}) = lower(${name})`;
}

export function drizzleCategoryRepository(db: Database): CategoryRepository {
  async function categoryNameTaken(
    userId: string,
    type: string,
    name: string,
    exceptId?: string,
  ): Promise<boolean> {
    const rows = await db
      .select({ id: category.id })
      .from(category)
      .where(
        and(
          eq(category.userId, userId),
          eq(category.type, type),
          sameName(category.name, name),
          exceptId ? ne(category.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async function groupNameTaken(userId: string, name: string, exceptId?: string) {
    const rows = await db
      .select({ id: categoryGroup.id })
      .from(categoryGroup)
      .where(
        and(
          eq(categoryGroup.userId, userId),
          sameName(categoryGroup.name, name),
          exceptId ? ne(categoryGroup.id, exceptId) : undefined,
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  return {
    async listGroups(userId) {
      const rows = await db
        .select()
        .from(categoryGroup)
        .where(eq(categoryGroup.userId, userId))
        .orderBy(asc(categoryGroup.sortOrder));
      return rows.map(toGroup);
    },

    async listCategories(userId) {
      const rows = await db
        .select()
        .from(category)
        .where(eq(category.userId, userId))
        .orderBy(asc(category.sortOrder));
      return rows.map(toCategory);
    },

    async findCategory(userId, categoryId) {
      const [row] = await db
        .select()
        .from(category)
        .where(and(eq(category.userId, userId), eq(category.id, categoryId)));
      return row ? toCategory(row) : null;
    },

    async findGroup(userId, groupId) {
      const [row] = await db
        .select()
        .from(categoryGroup)
        .where(and(eq(categoryGroup.userId, userId), eq(categoryGroup.id, groupId)));
      return row ? toGroup(row) : null;
    },

    async insertCategory(userId, input) {
      if (await categoryNameTaken(userId, input.type, input.name)) {
        return "name_taken";
      }
      const siblings = await db
        .select({ sortOrder: category.sortOrder })
        .from(category)
        .where(
          and(
            eq(category.userId, userId),
            eq(category.type, input.type),
            input.groupId ? eq(category.groupId, input.groupId) : undefined,
          ),
        );
      try {
        const [row] = await db
          .insert(category)
          .values({
            userId,
            type: input.type,
            groupId: input.groupId,
            name: input.name,
            icon: input.icon,
            color: input.color,
            sortOrder: nextSortOrder(siblings.map((item) => item.sortOrder)),
          })
          .returning();
        return toCategory(row as CategoryRow);
      } catch (error) {
        if (pgErrorCode(error) === UNIQUE_VIOLATION) {
          return "name_taken";
        }
        throw error;
      }
    },

    async updateCategory(userId, categoryId, patch) {
      const [current] = await db
        .select({ type: category.type })
        .from(category)
        .where(and(eq(category.userId, userId), eq(category.id, categoryId)));
      if (!current) {
        return null;
      }
      if (
        patch.name !== undefined &&
        (await categoryNameTaken(userId, current.type, patch.name, categoryId))
      ) {
        return "name_taken";
      }
      const moved =
        patch.groupId === undefined
          ? undefined
          : nextSortOrder(
              (
                await db
                  .select({ sortOrder: category.sortOrder })
                  .from(category)
                  .where(and(eq(category.userId, userId), eq(category.groupId, patch.groupId)))
              ).map((item) => item.sortOrder),
            );
      try {
        const [row] = await db
          .update(category)
          .set({
            ...(moved !== undefined ? { sortOrder: moved } : {}),
            ...(patch.name !== undefined ? { name: patch.name, nameKey: null } : {}),
            ...(patch.icon !== undefined ? { icon: patch.icon } : {}),
            ...(patch.color !== undefined ? { color: patch.color } : {}),
            ...(patch.groupId !== undefined ? { groupId: patch.groupId } : {}),
          })
          .where(and(eq(category.userId, userId), eq(category.id, categoryId)))
          .returning();
        return row ? toCategory(row) : null;
      } catch (error) {
        if (pgErrorCode(error) === UNIQUE_VIOLATION) {
          return "name_taken";
        }
        throw error;
      }
    },

    async setActive(userId, categoryId, isActive) {
      const [row] = await db
        .update(category)
        .set({ isActive })
        .where(and(eq(category.userId, userId), eq(category.id, categoryId)))
        .returning();
      return row ? toCategory(row) : null;
    },

    async deleteCategory(userId, categoryId) {
      try {
        const rows = await db
          .delete(category)
          .where(and(eq(category.userId, userId), eq(category.id, categoryId)))
          .returning({ id: category.id });
        return rows.length > 0 ? "deleted" : "not_found";
      } catch (error) {
        if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) {
          return "in_use";
        }
        throw error;
      }
    },

    async insertGroup(userId, name) {
      if (await groupNameTaken(userId, name)) {
        return "name_taken";
      }
      const siblings = await db
        .select({ sortOrder: categoryGroup.sortOrder })
        .from(categoryGroup)
        .where(eq(categoryGroup.userId, userId));
      try {
        const [row] = await db
          .insert(categoryGroup)
          .values({
            userId,
            name,
            sortOrder: nextSortOrder(siblings.map((item) => item.sortOrder)),
          })
          .returning();
        return toGroup(row as GroupRow);
      } catch (error) {
        if (pgErrorCode(error) === UNIQUE_VIOLATION) {
          return "name_taken";
        }
        throw error;
      }
    },

    async renameGroup(userId, groupId, name) {
      const [current] = await db
        .select({ id: categoryGroup.id })
        .from(categoryGroup)
        .where(and(eq(categoryGroup.userId, userId), eq(categoryGroup.id, groupId)));
      if (!current) {
        return null;
      }
      if (await groupNameTaken(userId, name, groupId)) {
        return "name_taken";
      }
      try {
        const [row] = await db
          .update(categoryGroup)
          .set({ name, nameKey: null })
          .where(and(eq(categoryGroup.userId, userId), eq(categoryGroup.id, groupId)))
          .returning();
        return row ? toGroup(row) : null;
      } catch (error) {
        if (pgErrorCode(error) === UNIQUE_VIOLATION) {
          return "name_taken";
        }
        throw error;
      }
    },

    async deleteGroup(userId, groupId) {
      try {
        const rows = await db
          .delete(categoryGroup)
          .where(and(eq(categoryGroup.userId, userId), eq(categoryGroup.id, groupId)))
          .returning({ id: categoryGroup.id });
        return rows.length > 0 ? "deleted" : "not_found";
      } catch (error) {
        if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) {
          return "not_empty";
        }
        throw error;
      }
    },
  };
}
