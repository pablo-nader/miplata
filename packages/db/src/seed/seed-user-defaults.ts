import { and, eq, inArray } from "drizzle-orm";
import type { Database } from "../client";
import { account, accountCurrency, category, categoryGroup } from "../schema";
import {
  DEFAULT_CASH_ACCOUNT_NAME_KEY,
  DEFAULT_EXPENSE_GROUPS,
  DEFAULT_INCOME_CATEGORIES,
} from "./defaults";

export async function seedUserDefaults(db: Database, userId: string): Promise<void> {
  if (!userId) {
    throw new Error("userId is required");
  }
  await db.transaction(async (tx) => {
    await tx
      .insert(categoryGroup)
      .values(
        DEFAULT_EXPENSE_GROUPS.map((group, index) => ({
          userId,
          nameKey: group.nameKey,
          sortOrder: index,
        })),
      )
      .onConflictDoNothing();

    const groups = await tx
      .select({ id: categoryGroup.id, nameKey: categoryGroup.nameKey })
      .from(categoryGroup)
      .where(
        and(
          eq(categoryGroup.userId, userId),
          inArray(
            categoryGroup.nameKey,
            DEFAULT_EXPENSE_GROUPS.map((group) => group.nameKey),
          ),
        ),
      );
    const groupIds = new Map(groups.map((group) => [group.nameKey, group.id]));

    const expenseRows = DEFAULT_EXPENSE_GROUPS.flatMap((group) =>
      group.categories.map((item, index) => ({
        userId,
        type: "expense",
        groupId: groupIds.get(group.nameKey) ?? null,
        nameKey: item.nameKey,
        icon: item.icon,
        color: group.color,
        sortOrder: index,
      })),
    );
    const incomeRows = DEFAULT_INCOME_CATEGORIES.map((item, index) => ({
      userId,
      type: "income",
      groupId: null,
      nameKey: item.nameKey,
      icon: item.icon,
      color: item.color,
      sortOrder: index,
    }));
    await tx
      .insert(category)
      .values([...expenseRows, ...incomeRows])
      .onConflictDoNothing();

    await tx
      .insert(account)
      .values({ userId, type: "cash", nameKey: DEFAULT_CASH_ACCOUNT_NAME_KEY })
      .onConflictDoNothing();
    const [cash] = await tx
      .select({ id: account.id })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.nameKey, DEFAULT_CASH_ACCOUNT_NAME_KEY)));
    if (cash) {
      await tx
        .insert(accountCurrency)
        .values([
          { userId, accountId: cash.id, currency: "ARS" },
          { userId, accountId: cash.id, currency: "USD" },
        ])
        .onConflictDoNothing();
    }
  });
}
