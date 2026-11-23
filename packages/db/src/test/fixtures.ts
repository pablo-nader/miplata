import type { Pool } from "pg";
import { expect } from "vitest";

export const CHECK = "23514";
export const FOREIGN_KEY = "23503";
export const UNIQUE = "23505";

export function createFixtures(getPool: () => Pool) {
  async function insertRow(text: string, values: unknown[] = []): Promise<string> {
    const result = await getPool().query(`${text} returning id`, values);
    return result.rows[0].id as string;
  }

  async function rejection(promise: Promise<unknown>) {
    try {
      await promise;
    } catch (error) {
      return error as { code: string; constraint?: string };
    }
    return { code: "none", constraint: undefined };
  }

  async function expectViolation(promise: Promise<unknown>, code: string, constraint: string) {
    const error = await rejection(promise);
    expect({ code: error.code, constraint: error.constraint }).toEqual({ code, constraint });
  }

  const newGroup = (userId: string) =>
    insertRow(
      "insert into category_group (user_id, name_key) values ($1, 'g' || gen_random_uuid())",
      [userId],
    );

  const newCategory = async (userId: string) =>
    insertRow(
      "insert into category (user_id, type, group_id, name_key, color) values ($1, 'expense', $2, 'c' || gen_random_uuid(), 1)",
      [userId, await newGroup(userId)],
    );

  const newAccount = (userId: string) =>
    insertRow(
      "insert into account (user_id, type, name_key) values ($1, 'cash', 'cash' || gen_random_uuid())",
      [userId],
    );

  const newMovement = async (userId: string, categoryId: string) =>
    insertRow(
      "insert into movement (user_id, type, occurred_on, category_id) values ($1, 'expense', '2026-01-15', $2)",
      [userId, categoryId],
    );

  const newCard = (userId: string) =>
    insertRow(
      "insert into account (user_id, type, name, closing_day, due_day) values ($1, 'credit_card', 'Visa', 20, 5)",
      [userId],
    );

  const newStatement = (userId: string, accountId: string) =>
    insertRow(
      "insert into statement (user_id, account_id, period_month, closing_date, due_date) values ($1, $2, '2026-01-01', '2026-01-20', '2026-02-05')",
      [userId, accountId],
    );

  const newRecurring = async (userId: string) =>
    insertRow(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, amount_minor, currency, account_id, category_id, starts_on) values ($1, 'expense', 'monthly', 5, 'fixed', 1000, 'ARS', $2, $3, '2026-01-01')",
      [userId, await newAccount(userId), await newCategory(userId)],
    );

  const newOccurrence = (userId: string, recurringId: string, dueOn = "2026-03-05") =>
    insertRow(
      "insert into recurring_occurrence (user_id, recurring_id, due_on) values ($1, $2, $3)",
      [userId, recurringId, dueOn],
    );

  return {
    insertRow,
    rejection,
    expectViolation,
    newGroup,
    newCategory,
    newAccount,
    newMovement,
    newCard,
    newStatement,
    newRecurring,
    newOccurrence,
  };
}
