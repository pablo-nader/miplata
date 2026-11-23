import {
  account,
  and,
  asc,
  type Database,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lte,
  posting,
  recurring,
  recurringOccurrence,
  sql,
} from "@miplata/db";
import {
  currencySchema,
  type IsoDate,
  type Occurrence,
  type Recurring,
  toSafeInteger,
} from "@miplata/shared";
import type {
  CommittedSchedule,
  GenerationCandidate,
  RecurringFields,
  RecurringRepository,
  StoredOccurrence,
} from "../application/recurring-repository";

type RecurringRow = typeof recurring.$inferSelect;

const INSERT_BATCH = 2000;

function toRecurring(row: RecurringRow): Recurring {
  return {
    id: row.id,
    type: row.type === "income" ? "income" : "expense",
    frequency: row.frequency as Recurring["frequency"],
    dayOfMonth: row.dayOfMonth,
    monthOfYear: row.monthOfYear,
    amountMode: row.amountMode === "variable" ? "variable" : "fixed",
    amountMinor: row.amountMinor === null ? null : toSafeInteger(row.amountMinor),
    currency: currencySchema.parse(row.currency),
    accountId: row.accountId,
    categoryId: row.categoryId,
    description: row.description,
    startsOn: row.startsOn,
    endsOn: row.endsOn,
    isPaused: row.isPaused,
  };
}

function columnsOf(fields: RecurringFields) {
  return {
    type: fields.type,
    frequency: fields.frequency,
    dayOfMonth: fields.dayOfMonth,
    monthOfYear: fields.monthOfYear,
    amountMode: fields.amountMode,
    amountMinor: fields.amountMinor === null ? null : BigInt(fields.amountMinor),
    currency: fields.currency,
    accountId: fields.accountId,
    categoryId: fields.categoryId,
    description: fields.description,
    startsOn: fields.startsOn,
    endsOn: fields.endsOn,
  };
}

export function drizzleRecurringRepository(db: Database): RecurringRepository {
  const ownedBy = (userId: string, recurringId: string) =>
    and(eq(recurring.userId, userId), eq(recurring.id, recurringId));

  const futurePending = (userId: string, recurringId: string, after: IsoDate) =>
    and(
      eq(recurringOccurrence.userId, userId),
      eq(recurringOccurrence.recurringId, recurringId),
      eq(recurringOccurrence.status, "pending"),
      gt(recurringOccurrence.dueOn, after),
    );

  async function lastConfirmedAmounts(userId: string, recurringIds: string[]) {
    if (recurringIds.length === 0) {
      return new Map<string, number>();
    }
    const rows = await db
      .selectDistinctOn([recurringOccurrence.recurringId], {
        recurringId: recurringOccurrence.recurringId,
        amountMinor: posting.amountMinor,
      })
      .from(recurringOccurrence)
      .innerJoin(
        posting,
        and(
          eq(posting.userId, recurringOccurrence.userId),
          eq(posting.movementId, recurringOccurrence.movementId),
        ),
      )
      .innerJoin(
        account,
        and(eq(account.userId, posting.userId), eq(account.id, posting.accountId)),
      )
      .where(
        and(
          eq(recurringOccurrence.userId, userId),
          eq(recurringOccurrence.status, "confirmed"),
          inArray(recurringOccurrence.recurringId, recurringIds),
          sql`${account.type} <> 'person'`,
        ),
      )
      .orderBy(recurringOccurrence.recurringId, desc(recurringOccurrence.dueOn));
    return new Map(rows.map((row) => [row.recurringId, Math.abs(toSafeInteger(row.amountMinor))]));
  }

  function toOccurrence(
    row: { id: string; dueOn: string; template: RecurringRow },
    lastConfirmed: Map<string, number>,
  ): Occurrence {
    const template = toRecurring(row.template);
    return {
      id: row.id,
      recurringId: template.id,
      dueOn: row.dueOn,
      type: template.type,
      description: template.description,
      categoryId: template.categoryId,
      accountId: template.accountId,
      currency: template.currency,
      amountMode: template.amountMode,
      suggestedAmountMinor:
        template.amountMode === "fixed"
          ? template.amountMinor
          : (lastConfirmed.get(template.id) ?? template.amountMinor),
    };
  }

  const joinedTemplate = (userId: string, extra: ReturnType<typeof and>) =>
    db
      .select({
        id: recurringOccurrence.id,
        dueOn: recurringOccurrence.dueOn,
        status: recurringOccurrence.status,
        template: recurring,
      })
      .from(recurringOccurrence)
      .innerJoin(
        recurring,
        and(
          eq(recurring.userId, recurringOccurrence.userId),
          eq(recurring.id, recurringOccurrence.recurringId),
        ),
      )
      .where(and(eq(recurringOccurrence.userId, userId), extra));

  return {
    async list(userId) {
      const rows = await db
        .select()
        .from(recurring)
        .where(eq(recurring.userId, userId))
        .orderBy(asc(recurring.dayOfMonth), asc(recurring.id));
      return rows.map(toRecurring);
    },

    async find(userId, recurringId) {
      const [row] = await db.select().from(recurring).where(ownedBy(userId, recurringId));
      return row ? toRecurring(row) : null;
    },

    async create(userId, fields) {
      const [row] = await db
        .insert(recurring)
        .values({ userId, ...columnsOf(fields) })
        .returning();
      return toRecurring(row as RecurringRow);
    },

    async update(userId, recurringId, fields, today) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .update(recurring)
          .set(columnsOf(fields))
          .where(ownedBy(userId, recurringId))
          .returning();
        if (!row) {
          return null;
        }
        await tx.delete(recurringOccurrence).where(futurePending(userId, recurringId, today));
        return toRecurring(row);
      });
    },

    async pause(userId, recurringId, today) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .update(recurring)
          .set({ isPaused: true })
          .where(ownedBy(userId, recurringId))
          .returning();
        if (!row) {
          return null;
        }
        await tx.delete(recurringOccurrence).where(futurePending(userId, recurringId, today));
        return toRecurring(row);
      });
    },

    async resume(userId, recurringId) {
      const [row] = await db
        .update(recurring)
        .set({ isPaused: false })
        .where(ownedBy(userId, recurringId))
        .returning();
      return row ? toRecurring(row) : null;
    },

    async end(userId, recurringId, endsOn) {
      return db.transaction(async (tx) => {
        const [row] = await tx
          .update(recurring)
          .set({ endsOn })
          .where(ownedBy(userId, recurringId))
          .returning();
        if (!row) {
          return null;
        }
        await tx.delete(recurringOccurrence).where(futurePending(userId, recurringId, endsOn));
        return toRecurring(row);
      });
    },

    async generationCandidates(userId, recurringId) {
      const rows = await db
        .select()
        .from(recurring)
        .where(
          and(
            eq(recurring.userId, userId),
            eq(recurring.isPaused, false),
            recurringId === undefined ? undefined : eq(recurring.id, recurringId),
          ),
        );
      if (rows.length === 0) {
        return [];
      }
      const latest = await db
        .select({
          recurringId: recurringOccurrence.recurringId,
          latest: sql<string>`max(${recurringOccurrence.dueOn})`,
        })
        .from(recurringOccurrence)
        .where(
          and(
            eq(recurringOccurrence.userId, userId),
            inArray(
              recurringOccurrence.recurringId,
              rows.map((row) => row.id),
            ),
          ),
        )
        .groupBy(recurringOccurrence.recurringId);
      const latestById = new Map(latest.map((row) => [row.recurringId, row.latest]));
      return rows.map(
        (row): GenerationCandidate => ({
          recurring: toRecurring(row),
          latestDueOn: latestById.get(row.id) ?? null,
        }),
      );
    },

    async insertOccurrences(userId, rows) {
      for (let start = 0; start < rows.length; start += INSERT_BATCH) {
        await db
          .insert(recurringOccurrence)
          .values(rows.slice(start, start + INSERT_BATCH).map((row) => ({ userId, ...row })))
          .onConflictDoNothing({
            target: [recurringOccurrence.recurringId, recurringOccurrence.dueOn],
          });
      }
    },

    async pendingOccurrences(userId, through, type) {
      const rows = await joinedTemplate(
        userId,
        and(
          eq(recurringOccurrence.status, "pending"),
          lte(recurringOccurrence.dueOn, through),
          type === undefined ? undefined : eq(recurring.type, type),
        ),
      ).orderBy(asc(recurringOccurrence.dueOn), asc(recurringOccurrence.id));
      const variableIds = [
        ...new Set(
          rows
            .filter((row) => row.template.amountMode === "variable")
            .map((row) => row.template.id),
        ),
      ];
      const lastConfirmed = await lastConfirmedAmounts(userId, variableIds);
      return rows.map((row) => toOccurrence(row, lastConfirmed));
    },

    async committedSchedule(userId, filter): Promise<CommittedSchedule> {
      const templates = await db
        .select()
        .from(recurring)
        .where(
          and(
            eq(recurring.userId, userId),
            eq(recurring.type, "expense"),
            eq(recurring.currency, filter.currency),
            eq(recurring.isPaused, false),
            lte(recurring.startsOn, filter.to),
            sql`(${recurring.endsOn} is null or ${recurring.endsOn} >= ${filter.from})`,
            filter.accountId ? eq(recurring.accountId, filter.accountId) : undefined,
            filter.categoryId ? eq(recurring.categoryId, filter.categoryId) : undefined,
          ),
        );
      if (templates.length === 0) {
        return { items: [], resolved: [] };
      }
      const ids = templates.map((row) => row.id);
      const variableIds = templates
        .filter((row) => row.amountMode === "variable")
        .map((row) => row.id);
      const [lastConfirmed, resolved] = await Promise.all([
        lastConfirmedAmounts(userId, variableIds),
        db
          .select({
            recurringId: recurringOccurrence.recurringId,
            dueOn: recurringOccurrence.dueOn,
          })
          .from(recurringOccurrence)
          .where(
            and(
              eq(recurringOccurrence.userId, userId),
              inArray(recurringOccurrence.recurringId, ids),
              inArray(recurringOccurrence.status, ["confirmed", "skipped"]),
              gte(recurringOccurrence.dueOn, filter.from),
              lte(recurringOccurrence.dueOn, filter.to),
            ),
          ),
      ]);
      return {
        items: templates.map((row) => {
          const template = toRecurring(row);
          return {
            recurring: template,
            estimateMinor:
              template.amountMode === "fixed"
                ? template.amountMinor
                : (lastConfirmed.get(template.id) ?? template.amountMinor),
          };
        }),
        resolved,
      };
    },

    async findOccurrence(userId, occurrenceId): Promise<StoredOccurrence | null> {
      const [row] = await joinedTemplate(userId, eq(recurringOccurrence.id, occurrenceId));
      if (!row) {
        return null;
      }
      const lastConfirmed = await lastConfirmedAmounts(
        userId,
        row.template.amountMode === "variable" ? [row.template.id] : [],
      );
      return { occurrence: toOccurrence(row, lastConfirmed), status: row.status };
    },

    async skip(userId, occurrenceId) {
      const skipped = await db
        .update(recurringOccurrence)
        .set({ status: "skipped" })
        .where(
          and(
            eq(recurringOccurrence.userId, userId),
            eq(recurringOccurrence.id, occurrenceId),
            eq(recurringOccurrence.status, "pending"),
          ),
        )
        .returning({ id: recurringOccurrence.id });
      if (skipped.length > 0) {
        return "skipped";
      }
      const [existing] = await db
        .select({ id: recurringOccurrence.id })
        .from(recurringOccurrence)
        .where(
          and(eq(recurringOccurrence.userId, userId), eq(recurringOccurrence.id, occurrenceId)),
        );
      return existing ? "resolved" : "not_found";
    },
  };
}
