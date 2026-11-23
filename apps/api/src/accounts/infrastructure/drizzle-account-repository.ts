import {
  account,
  accountCurrency,
  and,
  type Database,
  eq,
  inArray,
  institution,
  posting,
  recurring,
  sql,
  statement,
} from "@miplata/db";
import {
  type Account,
  type AccountType,
  accountTypeSchema,
  type Currency,
  currencySchema,
  institutionKindSchema,
  toSafeInteger,
} from "@miplata/shared";
import type { AccountChange, AccountRepository, NewAccount } from "../application/accounts";
import { accountBalance } from "../domain/balance";

const FOREIGN_KEY_VIOLATION = "23503";

const accountColumns = {
  id: account.id,
  type: account.type,
  name: account.name,
  nameKey: account.nameKey,
  closingDay: account.closingDay,
  dueDay: account.dueDay,
  isActive: account.isActive,
  institutionId: institution.id,
  institutionKind: institution.kind,
  institutionName: institution.name,
  institutionLogoPath: institution.logoPath,
};

function violationCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const { code, cause } = error as { code?: string; cause?: unknown };
  return code ?? violationCode(cause);
}

export function drizzleAccountRepository(
  db: Database,
  types: readonly AccountType[],
): AccountRepository {
  const typeList = [...types];

  async function usedAccountIds(userId: string, ids: string[]): Promise<Set<string>> {
    const [posted, statements, recurrings] = await Promise.all([
      db
        .selectDistinct({ id: posting.accountId })
        .from(posting)
        .where(and(eq(posting.userId, userId), inArray(posting.accountId, ids))),
      db
        .selectDistinct({ id: statement.accountId })
        .from(statement)
        .where(and(eq(statement.userId, userId), inArray(statement.accountId, ids))),
      db
        .selectDistinct({ id: recurring.accountId })
        .from(recurring)
        .where(and(eq(recurring.userId, userId), inArray(recurring.accountId, ids))),
    ]);
    return new Set([...posted, ...statements, ...recurrings].map((row) => row.id));
  }

  async function load(userId: string, accountId?: string): Promise<Account[]> {
    const rows = await db
      .select(accountColumns)
      .from(account)
      .leftJoin(institution, eq(account.institutionId, institution.id))
      .where(
        and(
          eq(account.userId, userId),
          inArray(account.type, typeList),
          ...(accountId ? [eq(account.id, accountId)] : []),
        ),
      )
      .orderBy(account.createdAt, account.id);
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) {
      return [];
    }
    const [currencies, sums, used] = await Promise.all([
      db
        .select()
        .from(accountCurrency)
        .where(and(eq(accountCurrency.userId, userId), inArray(accountCurrency.accountId, ids)))
        .orderBy(accountCurrency.currency),
      db
        .select({
          accountId: posting.accountId,
          currency: posting.currency,
          total: sql<string>`coalesce(sum(${posting.amountMinor}), 0)`,
        })
        .from(posting)
        .where(and(eq(posting.userId, userId), inArray(posting.accountId, ids)))
        .groupBy(posting.accountId, posting.currency),
      usedAccountIds(userId, ids),
    ]);
    const posted = new Map(sums.map((row) => [`${row.accountId}:${row.currency}`, row.total]));
    return rows.map((row) => ({
      id: row.id,
      type: accountTypeSchema.parse(row.type),
      name: row.name,
      nameKey: row.nameKey,
      institution:
        row.institutionId && row.institutionName
          ? {
              id: row.institutionId,
              kind: institutionKindSchema.parse(row.institutionKind),
              name: row.institutionName,
              logoPath: row.institutionLogoPath,
            }
          : null,
      closingDay: row.closingDay,
      dueDay: row.dueDay,
      isActive: row.isActive,
      canDelete: !used.has(row.id),
      currencies: currencies
        .filter((entry) => entry.accountId === row.id)
        .map((entry) => {
          const opening = toSafeInteger(entry.openingBalanceMinor);
          const postedMinor = toSafeInteger(BigInt(posted.get(`${row.id}:${entry.currency}`) ?? 0));
          return {
            currency: currencySchema.parse(entry.currency),
            openingBalanceMinor: opening,
            balanceMinor: accountBalance(opening, postedMinor),
          };
        }),
    }));
  }

  async function findOne(userId: string, accountId: string): Promise<Account | null> {
    const [found] = await load(userId, accountId);
    return found ?? null;
  }

  return {
    list: (userId) => load(userId),
    find: findOne,

    async create(userId: string, draft: NewAccount) {
      const id = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(account)
          .values({
            userId,
            type: draft.type,
            institutionId: draft.institutionId,
            name: draft.name,
            closingDay: draft.closingDay,
            dueDay: draft.dueDay,
          })
          .returning({ id: account.id });
        const accountId = (created as { id: string }).id;
        await tx.insert(accountCurrency).values(
          draft.currencies.map((entry) => ({
            userId,
            accountId,
            currency: entry.currency,
            openingBalanceMinor: BigInt(entry.openingBalanceMinor),
          })),
        );
        return accountId;
      });
      return (await findOne(userId, id)) as Account;
    },

    async update(userId: string, accountId: string, change: AccountChange) {
      const updated = await db.transaction(async (tx) => {
        const columns = {
          ...(change.institutionId !== undefined ? { institutionId: change.institutionId } : {}),
          ...(change.closingDay !== undefined ? { closingDay: change.closingDay } : {}),
          ...(change.dueDay !== undefined ? { dueDay: change.dueDay } : {}),
          ...(change.name !== undefined ? { name: change.name, nameKey: null } : {}),
        };
        const owned = and(
          eq(account.userId, userId),
          eq(account.id, accountId),
          inArray(account.type, typeList),
        );
        const [row] =
          Object.keys(columns).length > 0
            ? await tx.update(account).set(columns).where(owned).returning({ id: account.id })
            : await tx.select({ id: account.id }).from(account).where(owned);
        if (!row) {
          return false;
        }
        if (change.currencies) {
          const kept = change.currencies.map((entry) => entry.currency);
          await tx.delete(accountCurrency).where(
            and(
              eq(accountCurrency.userId, userId),
              eq(accountCurrency.accountId, accountId),
              sql`${accountCurrency.currency} not in (${sql.join(
                kept.map((currency) => sql`${currency}`),
                sql`, `,
              )})`,
            ),
          );
          for (const entry of change.currencies) {
            await tx
              .insert(accountCurrency)
              .values({
                userId,
                accountId,
                currency: entry.currency,
                openingBalanceMinor: BigInt(entry.openingBalanceMinor),
              })
              .onConflictDoUpdate({
                target: [accountCurrency.accountId, accountCurrency.currency],
                set: { openingBalanceMinor: BigInt(entry.openingBalanceMinor) },
              });
          }
        }
        return true;
      });
      return updated ? findOne(userId, accountId) : null;
    },

    async setActive(userId: string, accountId: string, isActive: boolean) {
      const [row] = await db
        .update(account)
        .set({ isActive })
        .where(
          and(
            eq(account.userId, userId),
            eq(account.id, accountId),
            inArray(account.type, typeList),
          ),
        )
        .returning({ id: account.id });
      return row ? findOne(userId, accountId) : null;
    },

    async remove(userId: string, accountId: string) {
      const existing = await findOne(userId, accountId);
      if (!existing) {
        return "not_found";
      }
      if (!existing.canDelete) {
        return "in_use";
      }
      try {
        await db.delete(account).where(and(eq(account.userId, userId), eq(account.id, accountId)));
        return "deleted";
      } catch (error) {
        if (violationCode(error) === FOREIGN_KEY_VIOLATION) {
          return "in_use";
        }
        throw error;
      }
    },

    async postedCurrencies(userId: string, accountId: string): Promise<Currency[]> {
      const [posted, scheduled] = await Promise.all([
        db
          .selectDistinct({ currency: posting.currency })
          .from(posting)
          .where(and(eq(posting.userId, userId), eq(posting.accountId, accountId))),
        db
          .selectDistinct({ currency: recurring.currency })
          .from(recurring)
          .where(and(eq(recurring.userId, userId), eq(recurring.accountId, accountId))),
      ]);
      const currencies = new Set([...posted, ...scheduled].map((row) => row.currency));
      return [...currencies].map((currency) => currencySchema.parse(currency));
    },
  };
}
