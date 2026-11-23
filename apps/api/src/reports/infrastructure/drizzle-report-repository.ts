import {
  account,
  and,
  asc,
  category,
  type Database,
  eq,
  gte,
  inArray,
  installment,
  lte,
  movement,
  posting,
  type SQL,
  sql,
} from "@miplata/db";
import { toSafeInteger } from "@miplata/shared";
import type { MovementsFilter, ReportRepository } from "../application/report-repository";
import type { TotalRow } from "../domain/report-aggregation";

const firstDay = (month: string) => `${month}-01`;

function postedToAccount(userId: string, accountId: string): SQL {
  return sql`exists (select 1 from ${posting} join ${account} on ${account.userId} = ${posting.userId} and ${account.id} = ${posting.accountId} where ${posting.userId} = ${userId} and ${posting.movementId} = ${movement.id} and ${posting.accountId} = ${accountId} and ${account.type} <> 'person')`;
}

function conditions(
  userId: string,
  filter: { currency: string; categoryId?: string | undefined; accountId?: string | undefined },
): SQL[] {
  const all: (SQL | undefined)[] = [
    eq(installment.userId, userId),
    eq(installment.currency, filter.currency),
    inArray(movement.type, ["income", "expense"]),
    filter.categoryId ? eq(movement.categoryId, filter.categoryId) : undefined,
    filter.accountId ? postedToAccount(userId, filter.accountId) : undefined,
  ];
  return all.filter((item): item is SQL => item !== undefined);
}

export function drizzleReportRepository(db: Database): ReportRepository {
  return {
    async totals(userId, filter): Promise<TotalRow[]> {
      const rows = await db
        .select({
          month: installment.periodMonth,
          type: movement.type,
          categoryId: movement.categoryId,
          groupId: category.groupId,
          total: sql<string>`sum(${installment.ownAmountMinor})`,
        })
        .from(installment)
        .innerJoin(
          movement,
          and(eq(movement.userId, installment.userId), eq(movement.id, installment.movementId)),
        )
        .leftJoin(
          category,
          and(eq(category.userId, movement.userId), eq(category.id, movement.categoryId)),
        )
        .where(
          and(
            ...conditions(userId, filter),
            gte(installment.periodMonth, firstDay(filter.from)),
            lte(installment.periodMonth, firstDay(filter.to)),
          ),
        )
        .groupBy(installment.periodMonth, movement.type, movement.categoryId, category.groupId);
      return rows.flatMap((row) =>
        row.categoryId
          ? [
              {
                month: row.month.slice(0, 7),
                type: row.type === "income" ? ("income" as const) : ("expense" as const),
                categoryId: row.categoryId,
                groupId: row.groupId,
                totalMinor: toSafeInteger(BigInt(row.total)),
              },
            ]
          : [],
      );
    },

    async spendingMovements(userId, filter: MovementsFilter) {
      const rows = await db
        .select({
          movementId: movement.id,
          occurredOn: movement.occurredOn,
          description: movement.description,
          categoryId: movement.categoryId,
          ownAmountMinor: sql<string>`sum(${installment.ownAmountMinor})`,
          installmentNumber: sql<number | null>`min(${installment.number})`,
          installmentCount: sql<number>`(select count(*)::int from ${installment} as sibling where sibling.user_id = ${userId} and sibling.movement_id = ${movement.id})`,
        })
        .from(installment)
        .innerJoin(
          movement,
          and(eq(movement.userId, installment.userId), eq(movement.id, installment.movementId)),
        )
        .where(
          and(
            ...conditions(userId, filter),
            eq(movement.type, "expense"),
            eq(installment.periodMonth, firstDay(filter.month)),
          ),
        )
        .groupBy(movement.id, movement.occurredOn, movement.description, movement.categoryId)
        .orderBy(asc(movement.occurredOn), asc(movement.id));
      return rows.flatMap((row) =>
        row.categoryId
          ? [
              {
                movementId: row.movementId,
                occurredOn: row.occurredOn,
                description: row.description,
                categoryId: row.categoryId,
                ownAmountMinor: toSafeInteger(BigInt(row.ownAmountMinor)),
                installmentNumber: row.installmentCount > 1 ? Number(row.installmentNumber) : null,
                installmentCount: Number(row.installmentCount),
              },
            ]
          : [],
      );
    },
  };
}
