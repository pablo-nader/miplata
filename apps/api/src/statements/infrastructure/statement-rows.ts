import { and, type Database, eq, gte, inArray, lte, statement } from "@miplata/db";
import type { YearMonth } from "@miplata/shared";
import type { Statement, StatementOverrides } from "../domain/statement-assignment";

export type Executor = Pick<Database, "select" | "insert">;

export const firstDay = (month: YearMonth) => `${month}-01`;

export async function readStatementOverrides(
  executor: Executor,
  userId: string,
  accountId: string,
  fromMonth: YearMonth,
  toMonth: YearMonth,
): Promise<StatementOverrides> {
  const rows = await executor
    .select()
    .from(statement)
    .where(
      and(
        eq(statement.userId, userId),
        eq(statement.accountId, accountId),
        gte(statement.periodMonth, firstDay(fromMonth)),
        lte(statement.periodMonth, firstDay(toMonth)),
      ),
    );
  const overrides: Record<string, { closingDate: string; dueDate: string }> = {};
  for (const row of rows) {
    const period = row.periodMonth.slice(0, 7);
    const usable = row.closingDate.slice(0, 7) === period && row.dueDate > row.closingDate;
    if (usable) {
      overrides[period] = { closingDate: row.closingDate, dueDate: row.dueDate };
    }
  }
  return overrides as StatementOverrides;
}

export async function ensureStatements(
  executor: Executor,
  userId: string,
  accountId: string,
  statements: readonly Statement[],
): Promise<Map<string, string>> {
  const unique = [...new Map(statements.map((item) => [item.periodMonth, item])).values()];
  await executor
    .insert(statement)
    .values(
      unique.map((item) => ({
        userId,
        accountId,
        periodMonth: firstDay(item.periodMonth),
        closingDate: item.closingDate,
        dueDate: item.dueDate,
      })),
    )
    .onConflictDoNothing({ target: [statement.accountId, statement.periodMonth] });
  const rows = await executor
    .select({ id: statement.id, periodMonth: statement.periodMonth })
    .from(statement)
    .where(
      and(
        eq(statement.userId, userId),
        eq(statement.accountId, accountId),
        inArray(
          statement.periodMonth,
          unique.map((item) => firstDay(item.periodMonth)),
        ),
      ),
    );
  return new Map(rows.map((row) => [row.periodMonth.slice(0, 7), row.id]));
}
