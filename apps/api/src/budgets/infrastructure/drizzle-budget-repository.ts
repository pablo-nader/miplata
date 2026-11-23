import { and, budget, type Database, eq, installment, movement, sql } from "@miplata/db";
import { type Budget, currencySchema, toSafeInteger, type YearMonth } from "@miplata/shared";
import type { BudgetRepository } from "../application/budget-repository";

type Row = typeof budget.$inferSelect;

type Target = { categoryId: string | null; groupId: string | null; currency: string };

function toBudget(row: Row): Budget {
  return {
    id: row.id,
    categoryId: row.categoryId,
    groupId: row.groupId,
    currency: currencySchema.parse(row.currency),
    limitMinor: toSafeInteger(row.limitMinor),
  };
}

function sameTarget(userId: string, input: Target) {
  return and(
    eq(budget.userId, userId),
    eq(budget.currency, input.currency),
    input.categoryId
      ? eq(budget.categoryId, input.categoryId)
      : eq(budget.groupId, input.groupId ?? ""),
  );
}

export function drizzleBudgetRepository(db: Database): BudgetRepository {
  return {
    async list(userId) {
      const rows = await db
        .select()
        .from(budget)
        .where(eq(budget.userId, userId))
        .orderBy(budget.createdAt, budget.id);
      return rows.map(toBudget);
    },
    async find(userId, budgetId) {
      const [row] = await db
        .select()
        .from(budget)
        .where(and(eq(budget.userId, userId), eq(budget.id, budgetId)));
      return row ? toBudget(row) : null;
    },
    async insert(userId, input) {
      return db.transaction(async (tx) => {
        const [taken] = await tx
          .select({ id: budget.id })
          .from(budget)
          .where(sameTarget(userId, input));
        if (taken) {
          return "duplicate";
        }
        const [row] = await tx
          .insert(budget)
          .values({
            userId,
            categoryId: input.categoryId,
            groupId: input.groupId,
            currency: input.currency,
            limitMinor: BigInt(input.limitMinor),
          })
          .returning();
        if (!row) {
          throw new Error("Budget insert returned no row");
        }
        return toBudget(row);
      });
    },
    async replace(userId, budgetId, input) {
      return db.transaction(async (tx) => {
        const [taken] = await tx
          .select({ id: budget.id })
          .from(budget)
          .where(and(sameTarget(userId, input), sql`${budget.id} <> ${budgetId}`));
        if (taken) {
          return "duplicate";
        }
        const [row] = await tx
          .update(budget)
          .set({
            categoryId: input.categoryId,
            groupId: input.groupId,
            currency: input.currency,
            limitMinor: BigInt(input.limitMinor),
          })
          .where(and(eq(budget.userId, userId), eq(budget.id, budgetId)))
          .returning();
        return row ? toBudget(row) : null;
      });
    },
    async remove(userId, budgetId) {
      const rows = await db
        .delete(budget)
        .where(and(eq(budget.userId, userId), eq(budget.id, budgetId)))
        .returning({ id: budget.id });
      return rows.length > 0;
    },
    async spentRows(userId, month: YearMonth) {
      const rows = await db
        .select({
          currency: installment.currency,
          categoryId: movement.categoryId,
          total: sql<string>`sum(${installment.ownAmountMinor})`,
        })
        .from(installment)
        .innerJoin(
          movement,
          and(eq(movement.userId, installment.userId), eq(movement.id, installment.movementId)),
        )
        .where(
          and(
            eq(installment.userId, userId),
            eq(installment.periodMonth, `${month}-01`),
            eq(movement.type, "expense"),
          ),
        )
        .groupBy(installment.currency, movement.categoryId);
      return rows.flatMap((row) =>
        row.categoryId
          ? [
              {
                kind: "expense" as const,
                periodMonth: month,
                currency: currencySchema.parse(row.currency),
                categoryId: row.categoryId,
                ownAmountMinor: toSafeInteger(BigInt(row.total)),
              },
            ]
          : [],
      );
    },
  };
}
