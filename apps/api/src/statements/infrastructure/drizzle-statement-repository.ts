import {
  account,
  and,
  asc,
  type Database,
  eq,
  gte,
  inArray,
  installment,
  lt,
  movement,
  posting,
  sql,
  statement,
} from "@miplata/db";
import {
  addMonths,
  type Currency,
  currencySchema,
  monthOf,
  toSafeInteger,
  type YearMonth,
} from "@miplata/shared";
import type {
  CardSchedule,
  DetailLines,
  StatementRepository,
} from "../application/statement-repository";
import { assignInstallmentStatements, statementForPurchase } from "../domain/statement-assignment";
import type { AmountLine, StatementRow } from "../domain/statement-summary";
import { ensureStatements, firstDay, readStatementOverrides } from "./statement-rows";

type StatementRecord = typeof statement.$inferSelect;

function nullableMinor(value: bigint | null): number | null {
  return value === null ? null : toSafeInteger(value);
}

function toRow(record: StatementRecord): StatementRow {
  return {
    id: record.id,
    accountId: record.accountId,
    periodMonth: record.periodMonth.slice(0, 7),
    closingDate: record.closingDate,
    dueDate: record.dueDate,
    minimumMinor: {
      ARS: nullableMinor(record.minimumArsMinor),
      USD: nullableMinor(record.minimumUsdMinor),
    },
    bankTotalMinor: {
      ARS: nullableMinor(record.bankTotalArsMinor),
      USD: nullableMinor(record.bankTotalUsdMinor),
    },
  };
}

const MAX_WINDOW = 62;

export function drizzleStatementRepository(db: Database): StatementRepository {
  async function findRecord(userId: string, statementId: string) {
    const rows = await db
      .select()
      .from(statement)
      .where(and(eq(statement.userId, userId), eq(statement.id, statementId)));
    return rows[0] ?? null;
  }

  return {
    async ensureOpen(userId, schedule, today) {
      const month = monthOf(today);
      const overrides = await readStatementOverrides(
        db,
        userId,
        schedule.accountId,
        addMonths(month, -1),
        addMonths(month, 1),
      );
      const open = statementForPurchase(today, schedule, overrides);
      await ensureStatements(db, userId, schedule.accountId, [open]);
    },

    async rows(userId, accountId) {
      const records = await db
        .select()
        .from(statement)
        .where(and(eq(statement.userId, userId), eq(statement.accountId, accountId)))
        .orderBy(asc(statement.periodMonth));
      return records.map(toRow);
    },

    async find(userId, statementId) {
      const record = await findRecord(userId, statementId);
      return record ? toRow(record) : null;
    },

    async amountLines(userId, accountId) {
      const [installments, payments] = await Promise.all([
        db
          .select({
            statementId: installment.statementId,
            currency: installment.currency,
            isPurchase: sql<boolean>`(${movement.statementId} is null)`,
            own: sql<string>`sum(${installment.ownAmountMinor})`,
            total: sql<string>`sum(${installment.amountMinor})`,
          })
          .from(installment)
          .innerJoin(
            movement,
            and(eq(movement.userId, installment.userId), eq(movement.id, installment.movementId)),
          )
          .innerJoin(
            statement,
            and(
              eq(statement.userId, installment.userId),
              eq(statement.id, installment.statementId),
            ),
          )
          .where(and(eq(installment.userId, userId), eq(statement.accountId, accountId)))
          .groupBy(
            installment.statementId,
            installment.currency,
            sql`(${movement.statementId} is null)`,
          ),
        db
          .select({
            statementId: movement.statementId,
            currency: posting.currency,
            total: sql<string>`sum(${posting.amountMinor})`,
          })
          .from(posting)
          .innerJoin(
            movement,
            and(eq(movement.userId, posting.userId), eq(movement.id, posting.movementId)),
          )
          .innerJoin(
            statement,
            and(eq(statement.userId, movement.userId), eq(statement.id, movement.statementId)),
          )
          .where(
            and(
              eq(posting.userId, userId),
              eq(posting.accountId, accountId),
              eq(statement.accountId, accountId),
              eq(movement.type, "transfer"),
              sql`${posting.amountMinor} > 0`,
            ),
          )
          .groupBy(movement.statementId, posting.currency),
      ]);
      const lines: AmountLine[] = [];
      for (const row of installments) {
        const currency = currencySchema.parse(row.currency);
        const statementId = row.statementId as string;
        const own = toSafeInteger(BigInt(row.own));
        const total = toSafeInteger(BigInt(row.total));
        if (row.isPurchase) {
          lines.push({ statementId, currency, kind: "own", amountMinor: own });
          lines.push({ statementId, currency, kind: "others", amountMinor: total - own });
        } else {
          lines.push({ statementId, currency, kind: "charges", amountMinor: total });
        }
      }
      for (const row of payments) {
        lines.push({
          statementId: row.statementId as string,
          currency: currencySchema.parse(row.currency),
          kind: "payments",
          amountMinor: toSafeInteger(BigInt(row.total)),
        });
      }
      return lines;
    },

    async detailLines(userId, statementId): Promise<DetailLines> {
      const record = await findRecord(userId, statementId);
      if (!record) {
        return { purchases: [], others: [], charges: [], payments: [] };
      }
      const [installments, paymentRows] = await Promise.all([
        db
          .select({
            movementId: movement.id,
            boundStatementId: movement.statementId,
            description: movement.description,
            categoryId: movement.categoryId,
            occurredOn: movement.occurredOn,
            number: installment.number,
            currency: installment.currency,
            amountMinor: installment.amountMinor,
            ownAmountMinor: installment.ownAmountMinor,
            installmentCount: sql<number>`(select count(*)::int from ${installment} as sibling where sibling.user_id = ${installment.userId} and sibling.movement_id = ${installment.movementId})`,
          })
          .from(installment)
          .innerJoin(
            movement,
            and(eq(movement.userId, installment.userId), eq(movement.id, installment.movementId)),
          )
          .where(and(eq(installment.userId, userId), eq(installment.statementId, statementId)))
          .orderBy(asc(movement.occurredOn), asc(movement.createdAt), asc(installment.number)),
        db
          .select({
            movementId: movement.id,
            occurredOn: movement.occurredOn,
            currency: posting.currency,
            amountMinor: posting.amountMinor,
          })
          .from(posting)
          .innerJoin(
            movement,
            and(eq(movement.userId, posting.userId), eq(movement.id, posting.movementId)),
          )
          .where(
            and(
              eq(posting.userId, userId),
              eq(posting.accountId, record.accountId),
              eq(movement.statementId, statementId),
              eq(movement.type, "transfer"),
              sql`${posting.amountMinor} > 0`,
            ),
          )
          .orderBy(asc(movement.occurredOn), asc(movement.createdAt)),
      ]);
      const sharedIds = installments
        .filter((row) => row.boundStatementId === null && row.amountMinor > row.ownAmountMinor)
        .map((row) => row.movementId);
      const people =
        sharedIds.length === 0
          ? []
          : await db
              .select({ movementId: posting.movementId, personId: posting.accountId })
              .from(posting)
              .innerJoin(
                account,
                and(eq(account.userId, posting.userId), eq(account.id, posting.accountId)),
              )
              .where(
                and(
                  eq(posting.userId, userId),
                  eq(account.type, "person"),
                  inArray(posting.movementId, sharedIds),
                ),
              );
      const personOf = new Map(people.map((row) => [row.movementId, row.personId]));
      const lines: DetailLines = { purchases: [], others: [], charges: [], payments: [] };
      for (const row of installments) {
        const currency: Currency = currencySchema.parse(row.currency);
        if (row.boundStatementId !== null) {
          lines.charges.push({
            movementId: row.movementId,
            categoryId: row.categoryId,
            description: row.description,
            occurredOn: row.occurredOn,
            currency,
            amountMinor: toSafeInteger(row.amountMinor),
          });
          continue;
        }
        const base = {
          movementId: row.movementId,
          description: row.description,
          number: row.number,
          installmentCount: row.installmentCount,
          currency,
        };
        if (row.ownAmountMinor > 0n) {
          lines.purchases.push({
            ...base,
            categoryId: row.categoryId,
            occurredOn: row.occurredOn,
            ownAmountMinor: toSafeInteger(row.ownAmountMinor),
          });
        }
        if (row.amountMinor > row.ownAmountMinor) {
          lines.others.push({
            ...base,
            personId: personOf.get(row.movementId) ?? null,
            amountMinor: toSafeInteger(row.amountMinor - row.ownAmountMinor),
          });
        }
      }
      lines.payments = paymentRows.map((row) => ({
        movementId: row.movementId,
        occurredOn: row.occurredOn,
        currency: currencySchema.parse(row.currency),
        amountMinor: toSafeInteger(row.amountMinor),
      }));
      return lines;
    },

    async updateDates(userId, statementId, dates, schedule: CardSchedule) {
      return db.transaction(async (tx) => {
        const [updated] = await tx
          .update(statement)
          .set({ closingDate: dates.closingDate, dueDate: dates.dueDate })
          .where(and(eq(statement.userId, userId), eq(statement.id, statementId)))
          .returning({ periodMonth: statement.periodMonth, accountId: statement.accountId });
        if (!updated) {
          return false;
        }
        const month: YearMonth = updated.periodMonth.slice(0, 7);
        const purchases = await tx
          .select({
            movementId: movement.id,
            occurredOn: movement.occurredOn,
            count: sql<number>`(select count(*)::int from ${installment} where ${installment.userId} = ${movement.userId} and ${installment.movementId} = ${movement.id})`,
          })
          .from(movement)
          .innerJoin(
            posting,
            and(eq(posting.userId, movement.userId), eq(posting.movementId, movement.id)),
          )
          .where(
            and(
              eq(movement.userId, userId),
              eq(movement.type, "expense"),
              sql`${movement.statementId} is null`,
              eq(posting.accountId, updated.accountId),
              sql`${posting.amountMinor} < 0`,
              gte(movement.occurredOn, firstDay(month)),
              lt(movement.occurredOn, firstDay(addMonths(month, 1))),
            ),
          );
        if (purchases.length === 0) {
          return true;
        }
        const overrides = await readStatementOverrides(
          tx,
          userId,
          updated.accountId,
          month,
          addMonths(month, MAX_WINDOW),
        );
        const assignments = purchases.map((purchase) => ({
          movementId: purchase.movementId,
          statements: assignInstallmentStatements(
            purchase.occurredOn,
            purchase.count,
            schedule,
            overrides,
          ),
        }));
        const ids = await ensureStatements(
          tx,
          userId,
          updated.accountId,
          assignments.flatMap((item) => item.statements),
        );
        for (const item of assignments) {
          for (const [index, target] of item.statements.entries()) {
            await tx
              .update(installment)
              .set({
                periodMonth: firstDay(target.periodMonth),
                statementId: ids.get(target.periodMonth) as string,
              })
              .where(
                and(
                  eq(installment.userId, userId),
                  eq(installment.movementId, item.movementId),
                  eq(installment.number, index + 1),
                ),
              );
          }
        }
        return true;
      });
    },

    async setBankFigures(userId, statementId, figures) {
      const toBig = (value: number | null) => (value === null ? null : BigInt(value));
      const updated = await db
        .update(statement)
        .set({
          bankTotalArsMinor: toBig(figures.bankTotalArsMinor),
          bankTotalUsdMinor: toBig(figures.bankTotalUsdMinor),
          minimumArsMinor: toBig(figures.minimumArsMinor),
          minimumUsdMinor: toBig(figures.minimumUsdMinor),
        })
        .where(and(eq(statement.userId, userId), eq(statement.id, statementId)))
        .returning({ id: statement.id });
      return updated.length > 0;
    },
  };
}
