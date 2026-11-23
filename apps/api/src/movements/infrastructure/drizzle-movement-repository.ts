import {
  account,
  and,
  type Database,
  desc,
  eq,
  gte,
  inArray,
  installment,
  lte,
  movement,
  ne,
  posting,
  recurringOccurrence,
  type SQL,
  sql,
  statement,
} from "@miplata/db";
import {
  currencySchema,
  type Movement,
  type MovementQuery,
  movementTypeSchema,
  toSafeInteger,
  type YearMonth,
} from "@miplata/shared";
import { FOREIGN_KEY_VIOLATION, pgErrorCode } from "../../shared/database/pg-error";
import {
  ensureStatements,
  readStatementOverrides,
} from "../../statements/infrastructure/statement-rows";
import type { MovementRepository } from "../application/movement-repository";
import type { MonthTotalRow } from "../domain/month-summary";
import type { MovementPlan } from "../domain/movement-plan";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

type MovementRow = typeof movement.$inferSelect;

const firstDay = (month: YearMonth) => `${month}-01`;

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function existsPosting(userId: string, conditions: SQL[]): SQL {
  return sql`exists (select 1 from ${posting} where ${posting.userId} = ${userId} and ${posting.movementId} = ${movement.id} and ${and(...conditions)})`;
}

function mainAmountCondition(userId: string, query: MovementQuery): SQL | null {
  const { minAmountMinor, maxAmountMinor } = query;
  if (minAmountMinor === undefined && maxAmountMinor === undefined) {
    return null;
  }
  const bounds = [
    ...(minAmountMinor === undefined
      ? []
      : [sql`abs(${posting.amountMinor}) >= ${minAmountMinor}`]),
    ...(maxAmountMinor === undefined
      ? []
      : [sql`abs(${posting.amountMinor}) <= ${maxAmountMinor}`]),
  ];
  return sql`exists (select 1 from ${posting} join ${account} on ${account.userId} = ${posting.userId} and ${account.id} = ${posting.accountId} where ${posting.userId} = ${userId} and ${posting.movementId} = ${movement.id} and ((${movement.type} = 'transfer' and ${posting.amountMinor} < 0) or (${movement.type} <> 'transfer' and ${account.type} <> 'person')) and ${and(...bounds)})`;
}

function listConditions(userId: string, query: MovementQuery): SQL[] {
  const amount = mainAmountCondition(userId, query);
  const conditions: (SQL | undefined)[] = [
    eq(movement.userId, userId),
    query.q ? sql`${movement.description} ilike ${`%${escapeLike(query.q)}%`}` : undefined,
    query.from ? gte(movement.occurredOn, query.from) : undefined,
    query.to ? lte(movement.occurredOn, query.to) : undefined,
    query.type ? eq(movement.type, query.type) : undefined,
    query.categoryId ? eq(movement.categoryId, query.categoryId) : undefined,
    query.accountId ? existsPosting(userId, [eq(posting.accountId, query.accountId)]) : undefined,
    query.personId ? existsPosting(userId, [eq(posting.accountId, query.personId)]) : undefined,
    query.currency ? existsPosting(userId, [eq(posting.currency, query.currency)]) : undefined,
    query.groupId
      ? sql`exists (select 1 from category where category.user_id = ${userId} and category.id = ${movement.categoryId} and category.group_id = ${query.groupId})`
      : undefined,
    amount ?? undefined,
  ];
  return conditions.filter((condition): condition is SQL => condition !== undefined);
}

export function drizzleMovementRepository(db: Database): MovementRepository {
  async function hydrate(userId: string, rows: MovementRow[]): Promise<Movement[]> {
    if (rows.length === 0) {
      return [];
    }
    const ids = rows.map((row) => row.id);
    const statementIds = [
      ...new Set(rows.flatMap((row) => (row.statementId ? [row.statementId] : []))),
    ];
    const [postings, installments, statementRows] = await Promise.all([
      db
        .select({
          movementId: posting.movementId,
          accountId: posting.accountId,
          accountType: account.type,
          currency: posting.currency,
          amountMinor: posting.amountMinor,
        })
        .from(posting)
        .innerJoin(
          account,
          and(eq(account.userId, posting.userId), eq(account.id, posting.accountId)),
        )
        .where(and(eq(posting.userId, userId), inArray(posting.movementId, ids))),
      db
        .select()
        .from(installment)
        .where(and(eq(installment.userId, userId), inArray(installment.movementId, ids)))
        .orderBy(installment.number),
      statementIds.length === 0
        ? Promise.resolve([])
        : db
            .select({
              id: statement.id,
              accountId: statement.accountId,
              periodMonth: statement.periodMonth,
            })
            .from(statement)
            .where(and(eq(statement.userId, userId), inArray(statement.id, statementIds))),
    ]);
    return rows.map((row) => {
      const bound = statementRows.find((entry) => entry.id === row.statementId);
      const own = postings.filter((entry) => entry.movementId === row.id);
      const parts = installments.filter((entry) => entry.movementId === row.id);
      const leg = (entry: (typeof own)[number]) => ({
        accountId: entry.accountId,
        currency: currencySchema.parse(entry.currency),
        amountMinor: Math.abs(toSafeInteger(entry.amountMinor)),
      });
      const main = own.find((entry) => entry.accountType !== "person");
      const personPosting = own.find((entry) => entry.accountType === "person");
      const isTransfer = row.type === "transfer";
      const source = own.find((entry) => entry.amountMinor < 0n);
      const target = own.find((entry) => entry.amountMinor > 0n);
      return {
        id: row.id,
        type: movementTypeSchema.parse(row.type),
        occurredOn: row.occurredOn,
        description: row.description,
        categoryId: row.categoryId,
        account: !isTransfer && main ? leg(main) : null,
        from: isTransfer && source ? leg(source) : null,
        to: isTransfer && target ? leg(target) : null,
        person:
          !isTransfer && personPosting
            ? {
                personId: personPosting.accountId,
                ownAmountMinor: parts.reduce(
                  (sum, part) => sum + toSafeInteger(part.ownAmountMinor),
                  0,
                ),
              }
            : null,
        installments: parts.map((part) => ({
          number: part.number,
          periodMonth: part.periodMonth.slice(0, 7),
          statementId: part.statementId,
          amountMinor: toSafeInteger(part.amountMinor),
          ownAmountMinor: toSafeInteger(part.ownAmountMinor),
        })),
        statement: bound
          ? { id: bound.id, accountId: bound.accountId, periodMonth: bound.periodMonth.slice(0, 7) }
          : null,
      };
    });
  }

  async function writeLines(
    tx: Transaction,
    userId: string,
    movementId: string,
    plan: MovementPlan,
  ): Promise<void> {
    const statementIds = plan.statementPlan
      ? await ensureStatements(
          tx,
          userId,
          plan.statementPlan.accountId,
          plan.statementPlan.statements,
        )
      : new Map<string, string>();
    await tx.insert(posting).values(
      plan.postings.map((item) => ({
        userId,
        movementId,
        accountId: item.accountId,
        currency: item.currency,
        amountMinor: BigInt(item.amountMinor),
      })),
    );
    if (plan.installments.length > 0) {
      await tx.insert(installment).values(
        plan.installments.map((item) => ({
          userId,
          movementId,
          number: item.number,
          periodMonth: firstDay(item.periodMonth),
          statementId: statementIds.get(item.periodMonth) ?? plan.statementId ?? null,
          currency: item.currency,
          amountMinor: BigInt(item.amountMinor),
          ownAmountMinor: BigInt(item.ownAmountMinor),
        })),
      );
    }
  }

  async function insertMovement(
    tx: Transaction,
    userId: string,
    plan: MovementPlan,
    recurringOccurrenceId: string | null,
  ): Promise<string> {
    const [created] = await tx
      .insert(movement)
      .values({
        userId,
        type: plan.type,
        occurredOn: plan.occurredOn,
        description: plan.description,
        categoryId: plan.categoryId,
        statementId: plan.statementId ?? null,
        recurringOccurrenceId,
      })
      .returning({ id: movement.id });
    const movementId = (created as { id: string }).id;
    await writeLines(tx, userId, movementId, plan);
    return movementId;
  }

  async function findOne(userId: string, movementId: string): Promise<Movement | null> {
    const rows = await db
      .select()
      .from(movement)
      .where(and(eq(movement.userId, userId), eq(movement.id, movementId)));
    const [found] = await hydrate(userId, rows);
    return found ?? null;
  }

  return {
    find: findOne,

    statementOverrides(userId, accountId, fromMonth, toMonth) {
      return readStatementOverrides(db, userId, accountId, fromMonth, toMonth);
    },

    async create(userId, plan) {
      const id = await db.transaction((tx) => insertMovement(tx, userId, plan, null));
      return (await findOne(userId, id)) as Movement;
    },

    async createForOccurrence(userId, occurrenceId, plan) {
      const id = await db.transaction(async (tx) => {
        const pending = await tx
          .select({ id: recurringOccurrence.id })
          .from(recurringOccurrence)
          .where(
            and(
              eq(recurringOccurrence.userId, userId),
              eq(recurringOccurrence.id, occurrenceId),
              eq(recurringOccurrence.status, "pending"),
            ),
          )
          .for("update");
        if (pending.length === 0) {
          return null;
        }
        const movementId = await insertMovement(tx, userId, plan, occurrenceId);
        await tx
          .update(recurringOccurrence)
          .set({ status: "confirmed", movementId })
          .where(
            and(eq(recurringOccurrence.userId, userId), eq(recurringOccurrence.id, occurrenceId)),
          );
        return movementId;
      });
      return id === null ? "not_pending" : ((await findOne(userId, id)) as Movement);
    },

    async createAll(userId, plans) {
      const ids = await db.transaction(async (tx) => {
        const created: string[] = [];
        for (const plan of plans) {
          created.push(await insertMovement(tx, userId, plan, null));
        }
        return created;
      });
      return Promise.all(ids.map((id) => findOne(userId, id) as Promise<Movement>));
    },

    async isStatementBound(userId, movementId) {
      const rows = await db
        .select({ statementId: movement.statementId })
        .from(movement)
        .where(and(eq(movement.userId, userId), eq(movement.id, movementId)));
      return rows[0]?.statementId != null;
    },

    async replace(userId, movementId, plan, alsoRemove = []) {
      const replaced = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(movement)
          .set({
            type: plan.type,
            occurredOn: plan.occurredOn,
            description: plan.description,
            categoryId: plan.categoryId,
            updatedAt: new Date(),
          })
          .where(and(eq(movement.userId, userId), eq(movement.id, movementId)))
          .returning({ id: movement.id });
        if (!row) {
          return false;
        }
        if (alsoRemove.length > 0) {
          await tx
            .delete(movement)
            .where(
              and(
                eq(movement.userId, userId),
                inArray(movement.id, alsoRemove),
                ne(movement.id, movementId),
              ),
            );
        }
        await tx
          .delete(posting)
          .where(and(eq(posting.userId, userId), eq(posting.movementId, movementId)));
        await tx
          .delete(installment)
          .where(and(eq(installment.userId, userId), eq(installment.movementId, movementId)));
        await writeLines(tx, userId, movementId, plan);
        return true;
      });
      return replaced ? findOne(userId, movementId) : null;
    },

    async list(userId, query) {
      const rows = await db
        .select()
        .from(movement)
        .where(and(...listConditions(userId, query)))
        .orderBy(desc(movement.occurredOn), desc(movement.createdAt), desc(movement.id))
        .limit(query.limit + 1)
        .offset(query.offset);
      const page = rows.slice(0, query.limit);
      return { items: await hydrate(userId, page), hasMore: rows.length > query.limit };
    },

    async remove(userId, movementId) {
      try {
        const removed = await db
          .delete(movement)
          .where(and(eq(movement.userId, userId), eq(movement.id, movementId)))
          .returning({ id: movement.id });
        return removed.length > 0 ? "deleted" : "not_found";
      } catch (error) {
        if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) {
          return "in_use";
        }
        throw error;
      }
    },

    async monthRows(userId, month): Promise<MonthTotalRow[]> {
      const rows = await db
        .select({
          currency: installment.currency,
          type: movement.type,
          total: sql<string>`sum(${installment.ownAmountMinor})`,
        })
        .from(installment)
        .innerJoin(
          movement,
          and(eq(movement.userId, installment.userId), eq(movement.id, installment.movementId)),
        )
        .where(and(eq(installment.userId, userId), eq(installment.periodMonth, firstDay(month))))
        .groupBy(installment.currency, movement.type);
      return rows.map((row) => ({
        currency: currencySchema.parse(row.currency),
        type: row.type === "income" ? "income" : "expense",
        totalMinor: toSafeInteger(BigInt(row.total)),
      }));
    },
  };
}
