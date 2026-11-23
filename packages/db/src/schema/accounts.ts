import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import {
  ACCOUNT_TYPES,
  CURRENCIES,
  createdAt,
  INSTITUTION_KINDS,
  inList,
  primaryId,
} from "./shared";

export const institution = pgTable(
  "institution",
  {
    id: primaryId(),
    kind: text("kind").notNull(),
    name: text("name").notNull().unique(),
    logoPath: text("logo_path"),
  },
  () => [check("institution_kind_check", inList("kind", INSTITUTION_KINDS))],
);

export const account = pgTable(
  "account",
  {
    id: primaryId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    institutionId: uuid("institution_id").references(() => institution.id, {
      onDelete: "restrict",
    }),
    nameKey: text("name_key"),
    name: text("name"),
    closingDay: integer("closing_day"),
    dueDay: integer("due_day"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("account_user_id_id_key").on(t.userId, t.id),
    uniqueIndex("account_user_name_key_key")
      .on(t.userId, t.nameKey)
      .where(sql`${t.nameKey} is not null`),
    check("account_type_check", inList("type", ACCOUNT_TYPES)),
    check("account_name_check", sql`num_nonnulls(${t.nameKey}, ${t.name}) = 1`),
    check(
      "account_card_days_check",
      sql`(${t.type} = 'credit_card' and (${t.closingDay} is null or ${t.closingDay} between 1 and 31) and (${t.dueDay} is null or ${t.dueDay} between 1 and 31)) or (${t.type} <> 'credit_card' and ${t.closingDay} is null and ${t.dueDay} is null)`,
    ),
  ],
);

export const accountCurrency = pgTable(
  "account_currency",
  {
    accountId: uuid("account_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    openingBalanceMinor: bigint("opening_balance_minor", { mode: "bigint" })
      .default(sql`0`)
      .notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.accountId, t.currency] }),
    foreignKey({
      name: "account_currency_account_fk",
      columns: [t.userId, t.accountId],
      foreignColumns: [account.userId, account.id],
    }).onDelete("cascade"),
    check("account_currency_currency_check", inList("currency", CURRENCIES)),
  ],
);
