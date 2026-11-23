import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { createdAt, primaryId } from "./shared";

export const categoryGroup = pgTable(
  "category_group",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    nameKey: text("name_key"),
    name: text("name"),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("category_group_user_id_id_key").on(t.userId, t.id),
    uniqueIndex("category_group_user_name_key")
      .on(t.userId, t.name)
      .where(sql`${t.name} is not null`),
    uniqueIndex("category_group_user_name_key_key")
      .on(t.userId, t.nameKey)
      .where(sql`${t.nameKey} is not null`),
    check("category_group_name_check", sql`num_nonnulls(${t.nameKey}, ${t.name}) = 1`),
  ],
);

export const category = pgTable(
  "category",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    groupId: uuid("group_id"),
    nameKey: text("name_key"),
    name: text("name"),
    icon: text("icon"),
    color: integer("color").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("category_user_id_id_key").on(t.userId, t.id),
    uniqueIndex("category_user_type_name_key")
      .on(t.userId, t.type, t.name)
      .where(sql`${t.name} is not null`),
    uniqueIndex("category_user_name_key_key")
      .on(t.userId, t.nameKey)
      .where(sql`${t.nameKey} is not null`),
    foreignKey({
      name: "category_group_fk",
      columns: [t.userId, t.groupId],
      foreignColumns: [categoryGroup.userId, categoryGroup.id],
    }).onDelete("restrict"),
    check(
      "category_group_required_check",
      sql`(${t.type} = 'expense' and ${t.groupId} is not null) or (${t.type} = 'income' and ${t.groupId} is null)`,
    ),
    check("category_name_check", sql`num_nonnulls(${t.nameKey}, ${t.name}) = 1`),
    check("category_color_check", sql`${t.color} between 1 and 5`),
  ],
);
