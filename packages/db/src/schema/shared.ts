import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

export const CURRENCIES = ["ARS", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const LOCALES = ["es", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const CATEGORY_TYPES = ["income", "expense"] as const;
export const MOVEMENT_TYPES = ["income", "expense", "transfer"] as const;
export const ACCOUNT_TYPES = ["cash", "bank", "wallet", "credit_card", "person"] as const;
export const INSTITUTION_KINDS = ["bank", "wallet"] as const;
export const FREQUENCIES = ["monthly", "bimonthly", "yearly"] as const;
export const AMOUNT_MODES = ["fixed", "variable"] as const;
export const OCCURRENCE_STATUSES = ["pending", "confirmed", "skipped"] as const;

export const primaryId = () => uuid("id").default(sql`gen_random_uuid()`).primaryKey();

export const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

export function inList(column: string, values: readonly string[]) {
  const list = values.map((value) => `'${value}'`).join(", ");
  return sql.raw(`"${column}" in (${list})`);
}
