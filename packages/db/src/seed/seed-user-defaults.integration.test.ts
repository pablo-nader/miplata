import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase } from "../test/test-database";
import { DEFAULT_EXPENSE_GROUPS, DEFAULT_INCOME_CATEGORIES } from "./defaults";
import { seedUserDefaults } from "./seed-user-defaults";

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(() => database.close());

async function counts(userId: string) {
  const result = await database.pool.query(
    `select
      (select count(*) from category_group where user_id = $1) as groups,
      (select count(*) from category where user_id = $1 and type = 'expense') as expenses,
      (select count(*) from category where user_id = $1 and type = 'income') as incomes,
      (select count(*) from account where user_id = $1) as accounts,
      (select count(*) from account_currency where user_id = $1) as currencies`,
    [userId],
  );
  return Object.fromEntries(
    Object.entries(result.rows[0] as Record<string, string>).map(([key, value]) => [
      key,
      Number(value),
    ]),
  );
}

describe("seedUserDefaults", () => {
  it("creates the default groups, categories and Cash account", async () => {
    // Arrange
    const userId = await database.insertUser();
    const expenseCount = DEFAULT_EXPENSE_GROUPS.flatMap((group) => group.categories).length;

    // Act
    await seedUserDefaults(database.db, userId);

    // Assert
    expect(await counts(userId)).toEqual({
      groups: DEFAULT_EXPENSE_GROUPS.length,
      expenses: expenseCount,
      incomes: DEFAULT_INCOME_CATEGORIES.length,
      accounts: 1,
      currencies: 2,
    });
  });

  it("attaches every expense category to a group and no income category", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    await seedUserDefaults(database.db, userId);
    const result = await database.pool.query(
      "select type, count(*) filter (where group_id is null) as without_group from category where user_id = $1 group by type order by type",
      [userId],
    );

    // Assert
    const byType = Object.fromEntries(
      result.rows.map((row) => [row.type, Number(row.without_group)]),
    );
    expect(byType.expense).toBe(0);
    expect(byType.income).toBe(DEFAULT_INCOME_CATEGORIES.length);
  });

  it("creates the Cash account as active, by translation key, at zero balance", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    await seedUserDefaults(database.db, userId);
    const result = await database.pool.query(
      "select a.type, a.name_key, a.name, a.is_active, c.currency, c.opening_balance_minor from account a join account_currency c on c.account_id = a.id where a.user_id = $1 order by c.currency",
      [userId],
    );

    // Assert
    expect(result.rows).toEqual([
      {
        type: "cash",
        name_key: "defaults.account.cash",
        name: null,
        is_active: true,
        currency: "ARS",
        opening_balance_minor: "0",
      },
      {
        type: "cash",
        name_key: "defaults.account.cash",
        name: null,
        is_active: true,
        currency: "USD",
        opening_balance_minor: "0",
      },
    ]);
  });

  it("stores each default with its icon, color and position", async () => {
    // Arrange
    const userId = await database.insertUser();
    const expected = [
      ...DEFAULT_EXPENSE_GROUPS.flatMap((group) =>
        group.categories.map((item, index) => [item.nameKey, item.icon, group.color, index]),
      ),
      ...DEFAULT_INCOME_CATEGORIES.map((item, index) => [
        item.nameKey,
        item.icon,
        item.color,
        index,
      ]),
    ].sort((a, b) => String(a[0]).localeCompare(String(b[0])));

    // Act
    await seedUserDefaults(database.db, userId);
    const result = await database.pool.query(
      "select name_key, icon, color, sort_order from category where user_id = $1 order by name_key",
      [userId],
    );

    // Assert
    const stored = result.rows.map((row) => [row.name_key, row.icon, row.color, row.sort_order]);
    expect(stored).toEqual(expected);
  });

  it("is idempotent", async () => {
    // Arrange
    const userId = await database.insertUser();
    await seedUserDefaults(database.db, userId);
    const before = await counts(userId);

    // Act
    await seedUserDefaults(database.db, userId);

    // Assert
    expect(await counts(userId)).toEqual(before);
  });

  it("does not duplicate rows when run concurrently", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    await Promise.all([
      seedUserDefaults(database.db, userId),
      seedUserDefaults(database.db, userId),
      seedUserDefaults(database.db, userId),
    ]);

    // Assert
    expect((await counts(userId)).accounts).toBe(1);
    expect((await counts(userId)).groups).toBe(DEFAULT_EXPENSE_GROUPS.length);
  });

  it("keeps a renamed default category", async () => {
    // Arrange
    const userId = await database.insertUser();
    await seedUserDefaults(database.db, userId);
    await database.pool.query(
      "update category set name_key = null, name = 'Rent and fees' where user_id = $1 and name_key = 'defaults.category.rent'",
      [userId],
    );

    // Act
    await seedUserDefaults(database.db, userId);
    const result = await database.pool.query(
      "select name from category where user_id = $1 and name = 'Rent and fees'",
      [userId],
    );

    // Assert
    expect(result.rows).toHaveLength(1);
  });

  it("keeps each user's data separate", async () => {
    // Arrange
    const first = await database.insertUser();
    const second = await database.insertUser();

    // Act
    await seedUserDefaults(database.db, first);
    await seedUserDefaults(database.db, second);
    const shared = await database.pool.query(
      "select count(*) as shared from category c join category_group g on g.id = c.group_id where c.user_id <> g.user_id",
    );

    // Assert
    expect(shared.rows[0].shared).toBe("0");
    expect((await counts(first)).accounts).toBe(1);
    expect((await counts(second)).accounts).toBe(1);
  });

  it("requires a userId", async () => {
    // Arrange
    const missing = "";

    // Act
    const run = seedUserDefaults(database.db, missing);

    // Assert
    await expect(run).rejects.toThrow("userId is required");
  });

  it("rejects a userId that does not exist", async () => {
    // Arrange
    const unknown = "00000000-0000-4000-8000-000000000000";

    // Act
    const run = seedUserDefaults(database.db, unknown);

    // Assert
    await expect(run).rejects.toThrow();
  });
});
