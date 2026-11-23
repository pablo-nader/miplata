import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  type PgTableExtraConfigValue,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { account } from "./accounts";
import { user } from "./auth";
import { category } from "./categories";
import {
  CATEGORY_TYPES,
  CURRENCIES,
  createdAt,
  FREQUENCIES,
  inList,
  OCCURRENCE_STATUSES,
  primaryId,
} from "./shared";

const owner = () =>
  uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" });

const minor = (name: string) => bigint(name, { mode: "bigint" });

export const statement = pgTable(
  "statement",
  {
    id: primaryId(),
    userId: owner(),
    accountId: uuid("account_id").notNull(),
    periodMonth: date("period_month", { mode: "string" }).notNull(),
    closingDate: date("closing_date", { mode: "string" }).notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    minimumArsMinor: minor("minimum_ars_minor"),
    minimumUsdMinor: minor("minimum_usd_minor"),
    bankTotalArsMinor: minor("bank_total_ars_minor"),
    bankTotalUsdMinor: minor("bank_total_usd_minor"),
  },
  (t) => [
    unique("statement_user_id_id_key").on(t.userId, t.id),
    unique("statement_account_period_key").on(t.accountId, t.periodMonth),
    foreignKey({
      name: "statement_account_fk",
      columns: [t.userId, t.accountId],
      foreignColumns: [account.userId, account.id],
    }).onDelete("restrict"),
    check("statement_dates_check", sql`${t.dueDate} >= ${t.closingDate}`),
    check("statement_period_month_check", sql`extract(day from ${t.periodMonth}) = 1`),
  ],
);

export const recurring = pgTable(
  "recurring",
  {
    id: primaryId(),
    userId: owner(),
    type: text("type").notNull(),
    frequency: text("frequency").notNull(),
    dayOfMonth: integer("day_of_month").notNull(),
    monthOfYear: integer("month_of_year"),
    amountMode: text("amount_mode").notNull(),
    amountMinor: minor("amount_minor"),
    currency: text("currency").notNull(),
    accountId: uuid("account_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    description: text("description"),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    endsOn: date("ends_on", { mode: "string" }),
    isPaused: boolean("is_paused").default(false).notNull(),
  },
  (t) => [
    unique("recurring_user_id_id_key").on(t.userId, t.id),
    foreignKey({
      name: "recurring_account_fk",
      columns: [t.userId, t.accountId],
      foreignColumns: [account.userId, account.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "recurring_category_fk",
      columns: [t.userId, t.categoryId],
      foreignColumns: [category.userId, category.id],
    }).onDelete("restrict"),
    check("recurring_type_check", inList("type", CATEGORY_TYPES)),
    check("recurring_frequency_check", inList("frequency", FREQUENCIES)),
    check("recurring_currency_check", inList("currency", CURRENCIES)),
    check("recurring_day_check", sql`${t.dayOfMonth} between 1 and 31`),
    check(
      "recurring_month_check",
      sql`(${t.frequency} = 'yearly' and ${t.monthOfYear} is not null and ${t.monthOfYear} between 1 and 12) or (${t.frequency} <> 'yearly' and ${t.monthOfYear} is null)`,
    ),
    check(
      "recurring_amount_check",
      sql`(${t.amountMode} = 'fixed' and ${t.amountMinor} is not null and ${t.amountMinor} > 0) or (${t.amountMode} = 'variable' and (${t.amountMinor} is null or ${t.amountMinor} > 0))`,
    ),
    check("recurring_range_check", sql`${t.endsOn} is null or ${t.endsOn} >= ${t.startsOn}`),
  ],
);

export const recurringOccurrence = pgTable(
  "recurring_occurrence",
  {
    id: primaryId(),
    userId: owner(),
    recurringId: uuid("recurring_id").notNull(),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    status: text("status").default("pending").notNull(),
    movementId: uuid("movement_id"),
  },
  (t): PgTableExtraConfigValue[] => [
    unique("recurring_occurrence_user_id_id_key").on(t.userId, t.id),
    unique("recurring_occurrence_recurring_due_key").on(t.recurringId, t.dueOn),
    foreignKey({
      name: "recurring_occurrence_recurring_fk",
      columns: [t.userId, t.recurringId],
      foreignColumns: [recurring.userId, recurring.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "recurring_occurrence_movement_fk",
      columns: [t.userId, t.movementId],
      foreignColumns: [movement.userId, movement.id],
    }).onDelete("restrict"),
    uniqueIndex("recurring_occurrence_movement_key")
      .on(t.movementId)
      .where(sql`${t.movementId} is not null`),
    check("recurring_occurrence_status_check", inList("status", OCCURRENCE_STATUSES)),
    check(
      "recurring_occurrence_confirmed_check",
      sql`(${t.status} = 'confirmed') = (${t.movementId} is not null)`,
    ),
  ],
);

export const movement = pgTable(
  "movement",
  {
    id: primaryId(),
    userId: owner(),
    type: text("type").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    description: text("description"),
    categoryId: uuid("category_id"),
    statementId: uuid("statement_id"),
    recurringOccurrenceId: uuid("recurring_occurrence_id"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t): PgTableExtraConfigValue[] => [
    unique("movement_user_id_id_key").on(t.userId, t.id),
    foreignKey({
      name: "movement_category_fk",
      columns: [t.userId, t.categoryId],
      foreignColumns: [category.userId, category.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "movement_statement_fk",
      columns: [t.userId, t.statementId],
      foreignColumns: [statement.userId, statement.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "movement_recurring_occurrence_fk",
      columns: [t.userId, t.recurringOccurrenceId],
      foreignColumns: [recurringOccurrence.userId, recurringOccurrence.id],
    }).onDelete("restrict"),
    check(
      "movement_category_required_check",
      sql`(${t.type} in ('income', 'expense') and ${t.categoryId} is not null) or (${t.type} = 'transfer' and ${t.categoryId} is null)`,
    ),
    index("movement_user_occurred_on_idx").on(t.userId, t.occurredOn.desc()),
    uniqueIndex("movement_recurring_occurrence_key")
      .on(t.recurringOccurrenceId)
      .where(sql`${t.recurringOccurrenceId} is not null`),
    index("movement_user_category_idx").on(t.userId, t.categoryId),
    index("movement_description_trgm_idx").using("gin", sql`${t.description} gin_trgm_ops`),
  ],
);

export const posting = pgTable(
  "posting",
  {
    id: primaryId(),
    userId: owner(),
    movementId: uuid("movement_id").notNull(),
    accountId: uuid("account_id").notNull(),
    currency: text("currency").notNull(),
    amountMinor: minor("amount_minor").notNull(),
  },
  (t) => [
    foreignKey({
      name: "posting_movement_fk",
      columns: [t.userId, t.movementId],
      foreignColumns: [movement.userId, movement.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "posting_account_fk",
      columns: [t.userId, t.accountId],
      foreignColumns: [account.userId, account.id],
    }).onDelete("restrict"),
    check("posting_currency_check", inList("currency", CURRENCIES)),
    index("posting_user_account_currency_idx").on(t.userId, t.accountId, t.currency),
    index("posting_user_movement_idx").on(t.userId, t.movementId),
  ],
);

export const installment = pgTable(
  "installment",
  {
    id: primaryId(),
    userId: owner(),
    movementId: uuid("movement_id").notNull(),
    number: integer("number").notNull(),
    periodMonth: date("period_month", { mode: "string" }).notNull(),
    statementId: uuid("statement_id"),
    currency: text("currency").notNull(),
    amountMinor: minor("amount_minor").notNull(),
    ownAmountMinor: minor("own_amount_minor").notNull(),
  },
  (t) => [
    uniqueIndex("installment_movement_number_key").on(t.movementId, t.number),
    foreignKey({
      name: "installment_movement_fk",
      columns: [t.userId, t.movementId],
      foreignColumns: [movement.userId, movement.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "installment_statement_fk",
      columns: [t.userId, t.statementId],
      foreignColumns: [statement.userId, statement.id],
    }).onDelete("restrict"),
    check("installment_currency_check", inList("currency", CURRENCIES)),
    check("installment_number_check", sql`${t.number} >= 1`),
    check("installment_own_amount_check", sql`${t.ownAmountMinor} between 0 and ${t.amountMinor}`),
    check("installment_period_month_check", sql`extract(day from ${t.periodMonth}) = 1`),
    index("installment_user_period_idx").on(t.userId, t.periodMonth),
    index("installment_user_statement_idx").on(t.userId, t.statementId),
  ],
);
