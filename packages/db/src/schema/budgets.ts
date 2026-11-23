import { sql } from "drizzle-orm";
import { bigint, check, foreignKey, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { category, categoryGroup } from "./categories";
import { CURRENCIES, createdAt, inList, primaryId } from "./shared";

export const budget = pgTable(
  "budget",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id"),
    groupId: uuid("group_id"),
    currency: text("currency").notNull(),
    limitMinor: bigint("limit_minor", { mode: "bigint" }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "budget_category_fk",
      columns: [t.userId, t.categoryId],
      foreignColumns: [category.userId, category.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "budget_group_fk",
      columns: [t.userId, t.groupId],
      foreignColumns: [categoryGroup.userId, categoryGroup.id],
    }).onDelete("cascade"),
    check("budget_target_check", sql`num_nonnulls(${t.categoryId}, ${t.groupId}) = 1`),
    check("budget_currency_check", inList("currency", CURRENCIES)),
    check("budget_limit_check", sql`${t.limitMinor} > 0`),
  ],
);
