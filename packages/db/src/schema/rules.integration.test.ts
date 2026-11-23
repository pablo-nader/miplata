import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CHECK, createFixtures, FOREIGN_KEY, UNIQUE } from "../test/fixtures";
import { createTestDatabase } from "../test/test-database";

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

let database: TestDatabase;

const {
  expectViolation,
  insertRow,
  newGroup,
  newCategory,
  newAccount,
  newMovement,
  newCard,
  newRecurring,
  newOccurrence,
} = createFixtures(() => database.pool);

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(() => database.close());

const recurringInsert = (overrides: Record<string, string>) => {
  const base: Record<string, string> = {
    type: "'expense'",
    frequency: "'monthly'",
    day_of_month: "5",
    month_of_year: "null",
    amount_mode: "'fixed'",
    amount_minor: "1000",
    currency: "'ARS'",
    ...overrides,
  };
  const columns = Object.keys(base).join(", ");
  const values = Object.values(base).join(", ");
  return `insert into recurring (user_id, account_id, category_id, starts_on, ${columns}) values ($1, $2, $3, '2026-01-01', ${values})`;
};

describe("recurring checks", () => {
  it.each([
    ["recurring_type_check", { type: "'transfer'" }],
    ["recurring_frequency_check", { frequency: "'weekly'" }],
    ["recurring_amount_check", { amount_mode: "'free'" }],
    ["recurring_day_check", { day_of_month: "32" }],
    ["recurring_month_check", { month_of_year: "3" }],
    ["recurring_amount_check", { amount_minor: "0" }],
  ])("rejects a row that violates %s", async (constraint, overrides) => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(recurringInsert(overrides), [userId, accountId, categoryId]);

    // Assert
    await expectViolation(insert, CHECK, constraint);
  });

  it("accepts a variable recurring without an amount", async () => {
    // Arrange
    const userId = await database.insertUser();
    const accountId = await newAccount(userId);
    const categoryId = await newCategory(userId);

    // Act
    const insert = database.pool.query(
      recurringInsert({ amount_mode: "'variable'", amount_minor: "null" }),
      [userId, accountId, categoryId],
    );

    // Assert
    await expect(insert).resolves.toBeDefined();
  });

  it("rejects a recurring that points to a category of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const accountId = await newAccount(owner);
    const foreignCategory = await newCategory(other);

    // Act
    const insert = database.pool.query(recurringInsert({}), [owner, accountId, foreignCategory]);

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "recurring_category_fk");
  });
});

describe("occurrence and movement link", () => {
  it("rejects an unknown occurrence status", async () => {
    // Arrange
    const userId = await database.insertUser();
    const recurringId = await newRecurring(userId);

    // Act
    const insert = database.pool.query(
      "insert into recurring_occurrence (user_id, recurring_id, due_on, status) values ($1, $2, '2026-03-05', 'done')",
      [userId, recurringId],
    );

    // Assert
    await expectViolation(insert, CHECK, "recurring_occurrence_status_check");
  });

  it("rejects a pending occurrence that already has a movement", async () => {
    // Arrange
    const userId = await database.insertUser();
    const recurringId = await newRecurring(userId);
    const movementId = await newMovement(userId, await newCategory(userId));

    // Act
    const insert = database.pool.query(
      "insert into recurring_occurrence (user_id, recurring_id, due_on, movement_id) values ($1, $2, '2026-03-05', $3)",
      [userId, recurringId, movementId],
    );

    // Assert
    await expectViolation(insert, CHECK, "recurring_occurrence_confirmed_check");
  });

  it("rejects two occurrences confirmed by the same movement", async () => {
    // Arrange
    const userId = await database.insertUser();
    const recurringId = await newRecurring(userId);
    const movementId = await newMovement(userId, await newCategory(userId));
    const sql =
      "insert into recurring_occurrence (user_id, recurring_id, due_on, status, movement_id) values ($1, $2, $3, 'confirmed', $4)";
    await database.pool.query(sql, [userId, recurringId, "2026-03-05", movementId]);

    // Act
    const insert = database.pool.query(sql, [userId, recurringId, "2026-04-05", movementId]);

    // Assert
    await expectViolation(insert, UNIQUE, "recurring_occurrence_movement_key");
  });

  it("rejects two movements that point to the same occurrence", async () => {
    // Arrange
    const userId = await database.insertUser();
    const occurrenceId = await newOccurrence(userId, await newRecurring(userId));
    const categoryId = await newCategory(userId);
    const sql =
      "insert into movement (user_id, type, occurred_on, category_id, recurring_occurrence_id) values ($1, 'expense', '2026-03-05', $2, $3)";
    await database.pool.query(sql, [userId, categoryId, occurrenceId]);

    // Act
    const insert = database.pool.query(sql, [userId, categoryId, occurrenceId]);

    // Assert
    await expectViolation(insert, UNIQUE, "movement_recurring_occurrence_key");
  });

  it("rejects a movement that points to an occurrence of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignOccurrence = await newOccurrence(other, await newRecurring(other));
    const categoryId = await newCategory(owner);

    // Act
    const insert = database.pool.query(
      "insert into movement (user_id, type, occurred_on, category_id, recurring_occurrence_id) values ($1, 'expense', '2026-03-05', $2, $3)",
      [owner, categoryId, foreignOccurrence],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "movement_recurring_occurrence_fk");
  });

  it("rejects an occurrence that points to a movement of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const recurringId = await newRecurring(owner);
    const foreignMovement = await newMovement(other, await newCategory(other));

    // Act
    const insert = database.pool.query(
      "insert into recurring_occurrence (user_id, recurring_id, due_on, status, movement_id) values ($1, $2, '2026-03-05', 'confirmed', $3)",
      [owner, recurringId, foreignMovement],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "recurring_occurrence_movement_fk");
  });

  it("deletes the occurrences of a deleted recurring", async () => {
    // Arrange
    const userId = await database.insertUser();
    const recurringId = await newRecurring(userId);
    await newOccurrence(userId, recurringId);

    // Act
    await database.pool.query("delete from recurring where id = $1", [recurringId]);
    const left = await database.pool.query(
      "select count(*) as total from recurring_occurrence where recurring_id = $1",
      [recurringId],
    );

    // Assert
    expect(left.rows[0].total).toBe("0");
  });
});

describe("names and types", () => {
  it("rejects an unknown movement type", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query(
      "insert into movement (user_id, type, occurred_on) values ($1, 'refund', '2026-01-15')",
      [userId],
    );

    // Assert
    await expectViolation(insert, CHECK, "movement_category_required_check");
  });

  it("rejects a group with neither name_key nor name", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query("insert into category_group (user_id) values ($1)", [
      userId,
    ]);

    // Assert
    await expectViolation(insert, CHECK, "category_group_name_check");
  });

  it("rejects an account with neither name_key nor name", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const insert = database.pool.query("insert into account (user_id, type) values ($1, 'cash')", [
      userId,
    ]);

    // Assert
    await expectViolation(insert, CHECK, "account_name_check");
  });

  it("rejects a duplicate default account key for the same user", async () => {
    // Arrange
    const userId = await database.insertUser();
    const sql =
      "insert into account (user_id, type, name_key) values ($1, 'cash', 'defaults.cash')";
    await database.pool.query(sql, [userId]);

    // Act
    const insert = database.pool.query(sql, [userId]);

    // Assert
    await expectViolation(insert, UNIQUE, "account_user_name_key_key");
  });

  it("rejects a duplicate custom group name for the same user", async () => {
    // Arrange
    const userId = await database.insertUser();
    const sql = "insert into category_group (user_id, name) values ($1, 'Pets')";
    await database.pool.query(sql, [userId]);

    // Act
    const insert = database.pool.query(sql, [userId]);

    // Assert
    await expectViolation(insert, UNIQUE, "category_group_user_name_key");
  });

  it("rejects a duplicate custom category name of the same type but allows another type", async () => {
    // Arrange
    const userId = await database.insertUser();
    const groupId = await newGroup(userId);
    await database.pool.query(
      "insert into category (user_id, type, group_id, name, color) values ($1, 'expense', $2, 'Other', 1)",
      [userId, groupId],
    );

    // Act
    const sameType = database.pool.query(
      "insert into category (user_id, type, group_id, name, color) values ($1, 'expense', $2, 'Other', 1)",
      [userId, groupId],
    );
    const otherType = database.pool.query(
      "insert into category (user_id, type, name, color) values ($1, 'income', 'Other', 1)",
      [userId],
    );

    // Assert
    await expectViolation(sameType, UNIQUE, "category_user_type_name_key");
    await expect(otherType).resolves.toBeDefined();
  });
});

describe("amounts and dates", () => {
  it.each([
    ["negative", -1],
    ["above the total", 101],
  ])("rejects an own amount %s", async (_label, own) => {
    // Arrange
    const userId = await database.insertUser();
    const movementId = await newMovement(userId, await newCategory(userId));

    // Act
    const insert = database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-01', 'ARS', 100, $3)",
      [userId, movementId, own],
    );

    // Assert
    await expectViolation(insert, CHECK, "installment_own_amount_check");
  });

  it("rejects a statement due before it closes", async () => {
    // Arrange
    const userId = await database.insertUser();
    const cardId = await newCard(userId);

    // Act
    const insert = database.pool.query(
      "insert into statement (user_id, account_id, period_month, closing_date, due_date) values ($1, $2, '2026-01-01', '2026-01-20', '2026-01-10')",
      [userId, cardId],
    );

    // Assert
    await expectViolation(insert, CHECK, "statement_dates_check");
  });

  it("rejects a statement period that is not the first day of a month", async () => {
    // Arrange
    const userId = await database.insertUser();
    const cardId = await newCard(userId);

    // Act
    const insert = database.pool.query(
      "insert into statement (user_id, account_id, period_month, closing_date, due_date) values ($1, $2, '2026-01-10', '2026-01-20', '2026-02-05')",
      [userId, cardId],
    );

    // Assert
    await expectViolation(insert, CHECK, "statement_period_month_check");
  });

  it("rejects an installment that points to a movement of another user", async () => {
    // Arrange
    const owner = await database.insertUser();
    const other = await database.insertUser();
    const foreignMovement = await newMovement(other, await newCategory(other));

    // Act
    const insert = database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-01', 'ARS', 100, 100)",
      [owner, foreignMovement],
    );

    // Assert
    await expectViolation(insert, FOREIGN_KEY, "installment_movement_fk");
  });
});

describe("delete rules", () => {
  it("rejects deleting an institution used by an account", async () => {
    // Arrange
    const userId = await database.insertUser();
    const institutionId = await insertRow(
      "insert into institution (kind, name) values ('bank', 'Test bank ' || gen_random_uuid())",
    );
    await database.pool.query(
      "insert into account (user_id, type, institution_id, name) values ($1, 'bank', $2, 'Main')",
      [userId, institutionId],
    );

    // Act
    const remove = database.pool.query("delete from institution where id = $1", [institutionId]);

    // Assert
    await expectViolation(remove, FOREIGN_KEY, "account_institution_id_institution_id_fk");
  });

  it("deletes the budgets of a deleted category and of a deleted group", async () => {
    // Arrange
    const userId = await database.insertUser();
    const categoryId = await insertRow(
      "insert into category (user_id, type, name_key, color) values ($1, 'income', 'budgeted', 1)",
      [userId],
    );
    const groupId = await newGroup(userId);
    await database.pool.query(
      "insert into budget (user_id, category_id, currency, limit_minor) values ($1, $2, 'ARS', 1000)",
      [userId, categoryId],
    );
    await database.pool.query(
      "insert into budget (user_id, group_id, currency, limit_minor) values ($1, $2, 'USD', 1000)",
      [userId, groupId],
    );

    // Act
    await database.pool.query("delete from category where id = $1", [categoryId]);
    await database.pool.query("delete from category_group where id = $1", [groupId]);
    const left = await database.pool.query(
      "select count(*) as total from budget where user_id = $1",
      [userId],
    );

    // Assert
    expect(left.rows[0].total).toBe("0");
  });

  it("deletes the sessions, auth accounts and money data of a user without movements", async () => {
    // Arrange
    const userId = await database.insertUser();
    await database.pool.query(
      "insert into session (expires_at, token, user_id) values (now(), $2, $1)",
      [userId, `token-${userId}`],
    );
    await database.pool.query(
      "insert into auth_account (account_id, provider_id, user_id) values ('g', 'google', $1)",
      [userId],
    );
    await newCategory(userId);
    await newAccount(userId);

    // Act
    await database.pool.query('delete from "user" where id = $1', [userId]);
    const left = await database.pool.query(
      "select (select count(*) from session where user_id = $1) + (select count(*) from auth_account where user_id = $1) + (select count(*) from category where user_id = $1) + (select count(*) from account where user_id = $1) as total",
      [userId],
    );

    // Assert
    expect(left.rows[0].total).toBe("0");
  });

  it("deletes a user together with movements, postings, installments, statements and recurring data", async () => {
    // Arrange
    const userId = await database.insertUser();
    const categoryId = await newCategory(userId);
    const accountId = await newAccount(userId);
    const cardId = await newCard(userId);
    const statementId = await insertRow(
      "insert into statement (user_id, account_id, period_month, closing_date, due_date) values ($1, $2, '2026-01-01', '2026-01-20', '2026-02-05')",
      [userId, cardId],
    );
    const movementId = await insertRow(
      "insert into movement (user_id, type, occurred_on, category_id, statement_id) values ($1, 'expense', '2026-01-15', $2, $3)",
      [userId, categoryId, statementId],
    );
    await database.pool.query(
      "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, 'ARS', -100)",
      [userId, movementId, accountId],
    );
    await database.pool.query(
      "insert into installment (user_id, movement_id, number, period_month, statement_id, currency, amount_minor, own_amount_minor) values ($1, $2, 1, '2026-01-01', $3, 'ARS', 100, 100)",
      [userId, movementId, statementId],
    );
    const occurrenceId = await newOccurrence(userId, await newRecurring(userId));
    const confirmedMovement = await insertRow(
      "insert into movement (user_id, type, occurred_on, category_id, recurring_occurrence_id) values ($1, 'expense', '2026-03-05', $2, $3)",
      [userId, categoryId, occurrenceId],
    );
    await database.pool.query(
      "update recurring_occurrence set status = 'confirmed', movement_id = $2 where id = $1",
      [occurrenceId, confirmedMovement],
    );

    // Act
    const remove = database.pool.query('delete from "user" where id = $1', [userId]);

    // Assert
    await expect(remove).resolves.toBeDefined();
  });
});
