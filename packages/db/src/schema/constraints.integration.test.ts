import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHECK, createFixtures, FOREIGN_KEY, UNIQUE } from "../test/fixtures";
import { createTestDatabase } from "../test/test-database";

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

let database: TestDatabase;

const {
  rejection,
  expectViolation,
  insertRow,
  newGroup,
  newCategory,
  newAccount,
  newMovement,
  newCard,
  newStatement,
  newRecurring,
} = createFixtures(() => database.pool);

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(() => database.close());

describe("category_group and category", () => {
  it("rejects an expense category without a group", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into category (user_id, type, name_key, color) values ($1, 'expense', 'x', 1)",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "category_group_required_check");
  });

  it("rejects an income category with a group", async () => {
    // Arrange
    const userId = await database.insertUser();
    const groupId = await newGroup(userId);

    // Act
    const insert = database.pool.query(
      "insert into category (user_id, type, group_id, name_key, color) values ($1, 'income', $2, 'x', 1)",
      [userId, groupId],
    );

    // Assert
    await expectViolation(insert, CHECK, "category_group_required_check");
  });

  it.each([0, 6])("rejects color %i", async (color) => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into category (user_id, type, name_key, color) values ($1, 'income', 'x', $2)",
      [userId, color],
    );

    // Assert
    await expectViolation(insert, CHECK, "category_color_check");
  });

  it("rejects an unknown category type", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into category (user_id, type, name_key, color) values ($1, 'transfer', 'x', 1)",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "category_group_required_check");
  });

  it("rejects a category with both name_key and name", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into category (user_id, type, name_key, name, color) values ($1, 'income', 'x', 'X', 1)",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "category_name_check");
  });

  it("rejects a category with neither name_key nor name", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into category (user_id, type, color) values ($1, 'income', 1)",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "category_name_check");
  });

  it("rejects a group with both name_key and name", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into category_group (user_id, name_key, name) values ($1, 'x', 'X')",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "category_group_name_check");
  });

  it("rejects a category that points to a group of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignGroup = await newGroup(other);

    // Act
    const insert = database.pool.query(
      "insert into category (user_id, type, group_id, name_key, color) values ($1, 'expense', $2, 'x', 1)",
      [owner, foreignGroup],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "category_group_fk");
  });

  it("rejects deleting a group that still has categories", async () => {
    // Arrange
    const userId = await database.insertUser();
    const groupId = await newGroup(userId);
    await insertRow(
      "insert into category (user_id, type, group_id, name_key, color) values ($1, 'expense', $2, 'x', 1)",
      [userId, groupId],
    );

    // Act
    const remove = database.pool.query("delete from category_group where id = $1", [groupId]);

    // Assert
    await expectViolation(remove, FOREIGN_KEY, "category_group_fk");
  });

  it("rejects a duplicate default name_key for the same user but allows it for another", async () => {
    // Arrange
    const first = await database.insertUser();
    const second = await database.insertUser();
    await database.pool.query("insert into category_group (user_id, name_key) values ($1, 'dup')", [
      first,
    ]);

    // Act
    const duplicate = database.pool.query(
      "insert into category_group (user_id, name_key) values ($1, 'dup')",
      [first],
    );
    const otherUser = database.pool.query(
      "insert into category_group (user_id, name_key) values ($1, 'dup')",
      [second],
    );

    // Assert
    await expectViolation(duplicate, UNIQUE, "category_group_user_name_key_key");
    await expect(otherUser).resolves.toBeDefined();
  });
});

describe("account and account_currency", () => {
  it("rejects closing and due days on a non credit card account", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into account (user_id, type, name, closing_day) values ($1, 'bank', 'Bank', 10)",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "account_card_days_check");
  });

  it("rejects a closing day out of range on a credit card", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into account (user_id, type, name, closing_day) values ($1, 'credit_card', 'Visa', 40)",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "account_card_days_check");
  });

  it("rejects an account with both name_key and name", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into account (user_id, type, name_key, name) values ($1, 'cash', 'x', 'X')",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "account_name_check");
  });

  it("rejects an unknown account type", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into account (user_id, type, name) values ($1, 'crypto', 'X')",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "account_type_check");
  });

  it("rejects a currency other than ARS or USD", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);

    // Act
    const insert = database.pool.query(
      "insert into account_currency (account_id, user_id, currency) values ($1, $2, 'EUR')",
      [accountId, userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "account_currency_currency_check");
  });

  it("rejects the same currency twice on one account", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    await database.pool.query(
      "insert into account_currency (account_id, user_id, currency) values ($1, $2, 'ARS')",
      [accountId, userId],
    );

    // Act
    const insert = database.pool.query(
      "insert into account_currency (account_id, user_id, currency) values ($1, $2, 'ARS')",
      [accountId, userId],
    );

    // Assert
    await expectViolation(insert, UNIQUE, "account_currency_account_id_currency_pk");
  });

  it("rejects a currency row that points to an account of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignAccount = await newAccount(other);

    // Act
    const insert = database.pool.query(
      "insert into account_currency (account_id, user_id, currency) values ($1, $2, 'ARS')",
      [foreignAccount, owner],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "account_currency_account_fk");
  });

  it("rejects an unknown institution kind", async () => {
    // Arrange
    const insert = database.pool.query(
      "insert into institution (kind, name) values ('exchange', 'Nowhere')",
    );

    // Act
    const error = await rejection(insert);

    // Assert
    expect(error.constraint).toBe("institution_kind_check");
  });

  it("rejects an unsupported user locale", async () => {
    // Arrange
    const insert = database.pool.query(
      "insert into \"user\" (name, email, locale) values ('A', 'locale@example.com', 'fr')",
    );

    // Act
    const error = await rejection(insert);

    // Assert
    expect(error.constraint).toBe("user_locale_check");
  });
});

describe("movement and posting", () => {
  it("rejects an expense without a category", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into movement (user_id, type, occurred_on) values ($1, 'expense', '2026-01-15')",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "movement_category_required_check");
  });

  it("rejects a transfer with a category", async () => {
    // Arrange
    const userId = await database.insertUser();
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      "insert into movement (user_id, type, occurred_on, category_id) values ($1, 'transfer', '2026-01-15', $2)",
      [userId, categoryId],
    );

    // Assert
    await expectViolation(insert, CHECK, "movement_category_required_check");
  });

  it("accepts a transfer without a category", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into movement (user_id, type, occurred_on) values ($1, 'transfer', '2026-01-15')",
      [userId],
    );

    // Assert
    await expect(insert).resolves.toBeDefined();
  });

  it("rejects a movement that points to a category of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignCategory = await newCategory(other);

    // Act
    const insert = database.pool.query(
      "insert into movement (user_id, type, occurred_on, category_id) values ($1, 'expense', '2026-01-15', $2)",
      [owner, foreignCategory],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "movement_category_fk");
  });

  it("rejects a movement that points to a statement of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const categoryId = await newCategory(owner);
    const foreignStatement = await newStatement(other, await newCard(other));

    // Act
    const insert = database.pool.query(
      "insert into movement (user_id, type, occurred_on, category_id, statement_id) values ($1, 'expense', '2026-01-15', $2, $3)",
      [owner, categoryId, foreignStatement],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "movement_statement_fk");
  });

  it("rejects a posting on an account of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const movementId = await newMovement(owner, await newCategory(owner));
    const foreignAccount = await newAccount(other);

    // Act
    const insert = database.pool.query(
      "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, 'ARS', -100)",
      [owner, movementId, foreignAccount],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "posting_account_fk");
  });

  it("rejects a posting on a movement of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignMovement = await newMovement(other, await newCategory(other));
    const accountId = await newAccount(owner);

    // Act
    const insert = database.pool.query(
      "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, 'ARS', -100)",
      [owner, foreignMovement, accountId],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "posting_movement_fk");
  });

  it("rejects a posting with an unsupported currency", async () => {
    // Arrange
    const userId = await database.insertUser();
    const movementId = await newMovement(userId, await newCategory(userId));
    const accountId = await newAccount(userId);

    // Act
    const insert = database.pool.query(
      "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, 'EUR', -100)",
      [userId, movementId, accountId],
    );

    // Assert
    await expectViolation(insert, CHECK, "posting_currency_check");
  });

  it("rejects deleting a category used by a movement", async () => {
    // Arrange
    const userId = await database.insertUser();
    const categoryId = await newCategory(userId);
    await newMovement(userId, categoryId);

    // Act
    const remove = database.pool.query("delete from category where id = $1", [categoryId]);

    // Assert
    await expectViolation(remove, FOREIGN_KEY, "movement_category_fk");
  });

  it("rejects deleting an account used by a posting", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const movementId = await newMovement(userId, await newCategory(userId));
    await database.pool.query(
      "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, 'ARS', -100)",
      [userId, movementId, accountId],
    );

    // Act
    const remove = database.pool.query("delete from account where id = $1", [accountId]);

    // Assert
    await expectViolation(remove, FOREIGN_KEY, "posting_account_fk");
  });

  it("deletes the postings and installments of a deleted movement", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const movementId = await newMovement(userId, await newCategory(userId));
    await database.pool.query(
      "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, 'ARS', -100)",
      [userId, movementId, accountId],
    );
    await database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-01', 'ARS', 100, 100)",
      [userId, movementId],
    );

    // Act
    await database.pool.query("delete from movement where id = $1", [movementId]);
    const left = await database.pool.query(
      "select (select count(*) from posting where movement_id = $1) as postings, (select count(*) from installment where movement_id = $1) as installments",
      [movementId],
    );

    // Assert
    expect(left.rows[0]).toEqual({ postings: "0", installments: "0" });
  });

  it("stores money as bigint without losing precision", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const movementId = await newMovement(userId, await newCategory(userId));
    const big = "9007199254740993";

    // Act
    const id = await insertRow(
      "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, 'USD', $4)",
      [userId, movementId, accountId, big],
    );
    const stored = await database.pool.query("select amount_minor from posting where id = $1", [
      id,
    ]);

    // Assert
    expect(stored.rows[0].amount_minor).toBe(big);
  });
});

describe("installment and statement", () => {
  it("rejects an installment number below 1", async () => {
    // Arrange
    const userId = await database.insertUser();
    const movementId = await newMovement(userId, await newCategory(userId));

    // Act
    const insert = database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, currency, amount_minor, own_amount_minor) values ($1, $2, 0, '2026-01-01', 'ARS', 100, 100)",
      [userId, movementId],
    );

    // Assert
    await expectViolation(insert, CHECK, "installment_number_check");
  });

  it("rejects an installment period that is not the first day of a month", async () => {
    // Arrange
    const userId = await database.insertUser();
    const movementId = await newMovement(userId, await newCategory(userId));

    // Act
    const insert = database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-15', 'ARS', 100, 100)",
      [userId, movementId],
    );

    // Assert
    await expectViolation(insert, CHECK, "installment_period_month_check");
  });

  it("rejects an installment with an unsupported currency", async () => {
    // Arrange
    const userId = await database.insertUser();
    const movementId = await newMovement(userId, await newCategory(userId));

    // Act
    const insert = database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-01', 'EUR', 100, 100)",
      [userId, movementId],
    );

    // Assert
    await expectViolation(insert, CHECK, "installment_currency_check");
  });

  it("rejects the same installment number twice on a movement", async () => {
    // Arrange
    const userId = await database.insertUser();
    const movementId = await newMovement(userId, await newCategory(userId));
    const sql =
      "insert into installment (user_id, movement_id, number, period_month, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-01', 'ARS', 100, 100)";
    await database.pool.query(sql, [userId, movementId]);

    // Act
    const insert = database.pool.query(sql, [userId, movementId]);

    // Assert
    await expectViolation(insert, UNIQUE, "installment_movement_number_key");
  });

  it("rejects an installment that points to a statement of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const movementId = await newMovement(owner, await newCategory(owner));
    const foreignStatement = await newStatement(other, await newCard(other));

    // Act
    const insert = database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, statement_id, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-01', $3, 'ARS', 100, 100)",
      [owner, movementId, foreignStatement],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "installment_statement_fk");
  });

  it("rejects a statement on an account of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignCard = await newCard(other);

    // Act
    const insert = newStatement(owner, foreignCard);

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "statement_account_fk");
  });

  it("rejects two statements for the same card and month", async () => {
    // Arrange
    const userId = await database.insertUser();
    const cardId = await newCard(userId);
    await newStatement(userId, cardId);

    // Act
    const insert = newStatement(userId, cardId);

    // Assert
    await expectViolation(insert, UNIQUE, "statement_account_period_key");
  });

  it("rejects deleting a statement used by a movement", async () => {
    // Arrange
    const userId = await database.insertUser();
    const statementId = await newStatement(userId, await newCard(userId));
    await database.pool.query(
      "insert into movement (user_id, type, occurred_on, category_id, statement_id) values ($1, 'expense', '2026-01-15', $2, $3)",
      [userId, await newCategory(userId), statementId],
    );

    // Act
    const remove = database.pool.query("delete from statement where id = $1", [statementId]);

    // Assert
    await expectViolation(remove, FOREIGN_KEY, "movement_statement_fk");
  });
});

describe("recurring and recurring_occurrence", () => {
  it("rejects a yearly recurring without a month", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, amount_minor, currency, account_id, category_id, starts_on) values ($1, 'expense', 'yearly', 5, 'fixed', 1000, 'ARS', $2, $3, '2026-01-01')",
      [userId, accountId, categoryId],
    );

    // Assert
    await expectViolation(insert, CHECK, "recurring_month_check");
  });

  it("rejects a fixed recurring without an amount", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, currency, account_id, category_id, starts_on) values ($1, 'expense', 'monthly', 5, 'fixed', 'ARS', $2, $3, '2026-01-01')",
      [userId, accountId, categoryId],
    );

    // Assert
    await expectViolation(insert, CHECK, "recurring_amount_check");
  });

  it("rejects a recurring that ends before it starts", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, currency, account_id, category_id, starts_on, ends_on) values ($1, 'expense', 'monthly', 5, 'variable', 'ARS', $2, $3, '2026-02-01', '2026-01-01')",
      [userId, accountId, categoryId],
    );

    // Assert
    await expectViolation(insert, CHECK, "recurring_range_check");
  });

  it("rejects a recurring with an unsupported currency", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, currency, account_id, category_id, starts_on) values ($1, 'expense', 'monthly', 5, 'variable', 'EUR', $2, $3, '2026-01-01')",
      [userId, accountId, categoryId],
    );

    // Assert
    await expectViolation(insert, CHECK, "recurring_currency_check");
  });

  it("rejects a recurring that points to an account of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignAccount = await newAccount(other);
    const categoryId = await newCategory(owner);

    // Act
    const insert = database.pool.query(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, currency, account_id, category_id, starts_on) values ($1, 'expense', 'monthly', 5, 'variable', 'ARS', $2, $3, '2026-01-01')",
      [owner, foreignAccount, categoryId],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "recurring_account_fk");
  });

  it("rejects two occurrences for the same recurring and due date", async () => {
    // Arrange
    const userId = await database.insertUser();
    const recurringId = await newRecurring(userId);
    const sql =
      "insert into recurring_occurrence (user_id, recurring_id, due_on) values ($1, $2, '2026-03-05')";
    await database.pool.query(sql, [userId, recurringId]);

    // Act
    const insert = database.pool.query(sql, [userId, recurringId]);

    // Assert
    await expectViolation(insert, UNIQUE, "recurring_occurrence_recurring_due_key");
  });

  it("rejects a confirmed occurrence without a movement", async () => {
    // Arrange
    const userId = await database.insertUser();
    const recurringId = await newRecurring(userId);

    // Act
    const insert = database.pool.query(
      "insert into recurring_occurrence (user_id, recurring_id, due_on, status) values ($1, $2, '2026-03-05', 'confirmed')",
      [userId, recurringId],
    );

    // Assert
    await expectViolation(insert, CHECK, "recurring_occurrence_confirmed_check");
  });

  it("rejects an occurrence that points to a recurring of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignRecurring = await newRecurring(other);

    // Act
    const insert = database.pool.query(
      "insert into recurring_occurrence (user_id, recurring_id, due_on) values ($1, $2, '2026-03-05')",
      [owner, foreignRecurring],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "recurring_occurrence_recurring_fk");
  });

  it("rejects deleting an account used by a recurring", async () => {
    // Arrange
    const userId = await database.insertUser();
    const recurringId = await newRecurring(userId);
    const row = await database.pool.query("select account_id from recurring where id = $1", [
      recurringId,
    ]);

    // Act
    const remove = database.pool.query("delete from account where id = $1", [
      row.rows[0].account_id,
    ]);

    // Assert
    await expectViolation(remove, FOREIGN_KEY, "recurring_account_fk");
  });
});

describe("budget", () => {
  it("rejects a budget with both a category and a group", async () => {
    // Arrange
    const userId = await database.insertUser();
    const categoryId = await newCategory(userId);
    const groupId = await newGroup(userId);

    // Act
    const insert = database.pool.query(
      "insert into budget (user_id, category_id, group_id, currency, limit_minor) values ($1, $2, $3, 'ARS', 1000)",
      [userId, categoryId, groupId],
    );

    // Assert
    await expectViolation(insert, CHECK, "budget_target_check");
  });

  it("rejects a budget with neither a category nor a group", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into budget (user_id, currency, limit_minor) values ($1, 'ARS', 1000)",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "budget_target_check");
  });

  it("rejects a budget with an unsupported currency", async () => {
    // Arrange
    const userId = await database.insertUser();
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      "insert into budget (user_id, category_id, currency, limit_minor) values ($1, $2, 'EUR', 1000)",
      [userId, categoryId],
    );

    // Assert
    await expectViolation(insert, CHECK, "budget_currency_check");
  });

  it("rejects a budget with a limit of zero", async () => {
    // Arrange
    const userId = await database.insertUser();
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      "insert into budget (user_id, category_id, currency, limit_minor) values ($1, $2, 'ARS', 0)",
      [userId, categoryId],
    );

    // Assert
    await expectViolation(insert, CHECK, "budget_limit_check");
  });

  it("rejects a budget on a category of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignCategory = await newCategory(other);

    // Act
    const insert = database.pool.query(
      "insert into budget (user_id, category_id, currency, limit_minor) values ($1, $2, 'ARS', 1000)",
      [owner, foreignCategory],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "budget_category_fk");
  });

  it("rejects a budget on a group of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignGroup = await newGroup(other);

    // Act
    const insert = database.pool.query(
      "insert into budget (user_id, group_id, currency, limit_minor) values ($1, $2, 'ARS', 1000)",
      [owner, foreignGroup],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "budget_group_fk");
  });
});
