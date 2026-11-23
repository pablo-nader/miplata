import type { CategoriesResponse } from "@miplata/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthHarness } from "../test/auth-harness";

type Harness = Awaited<ReturnType<typeof createAuthHarness>>;

let harness: Harness;
let counter = 0;

beforeAll(async () => {
  harness = await createAuthHarness();
});

afterAll(async () => {
  await harness.close();
});

type Json = ReturnType<typeof JSON.parse>;

function call(cookie: string | undefined, method: string, path: string, body?: unknown) {
  const hasBody = body !== undefined && method !== "GET";
  return harness.app.request(`/api${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(hasBody ? { "content-type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });
}

async function ok(response: Response, status = 200): Promise<Json> {
  const body = response.status === 204 ? {} : ((await response.json()) as Json);
  expect(response.status, JSON.stringify(body)).toBe(status);
  return body;
}

const both = [
  { currency: "ARS", openingBalanceMinor: 0 },
  { currency: "USD", openingBalanceMinor: 0 },
];

async function newUser() {
  counter += 1;
  const userId = await harness.signUpWithGoogle(`movements-${counter}@example.com`);
  const cookie = await harness.cookieFor(userId);
  const account = async (body: Json) =>
    (await ok(await call(cookie, "POST", "/accounts", body), 201)).id as string;
  const catalog = (await ok(await call(cookie, "GET", "/categories"))) as CategoriesResponse;
  const group = catalog.expenseGroups[0];
  return {
    cookie,
    userId,
    cash: await account({ type: "cash", name: "Cash", currencies: both }),
    bank: await account({ type: "bank", name: "Bank", currencies: both }),
    visa: await account({
      type: "credit_card",
      name: "Visa",
      closingDay: 20,
      dueDay: 5,
      currencies: both,
    }),
    juan: (
      await ok(
        await call(cookie, "POST", "/people", {
          name: "Juan",
          currencies: both,
        }),
        201,
      )
    ).id as string,
    food: group?.categories[0]?.id as string,
    groupId: group?.id as string,
    otherFood: group?.categories[1]?.id as string,
    salary: catalog.income[0]?.id as string,
  };
}

type User = Awaited<ReturnType<typeof newUser>>;

function expense(user: User, changes: Json = {}) {
  return {
    type: "expense",
    occurredOn: "2026-11-10",
    categoryId: user.food,
    accountId: user.cash,
    currency: "ARS",
    amountMinor: 1_000_00,
    ...changes,
  };
}

async function record(user: User, body: Json) {
  return ok(await call(user.cookie, "POST", "/movements", body), 201);
}

async function balanceOf(user: User, accountId: string, currency: string, path = "/accounts") {
  const account = await ok(await call(user.cookie, "GET", `${path}/${accountId}`));
  return (account.currencies as Json[]).find((entry) => entry.currency === currency)
    ?.balanceMinor as number;
}

async function count(table: string, userId: string) {
  const result = await harness.pool.query(
    `select count(*)::int as n from ${table} where user_id = $1`,
    [userId],
  );
  return result.rows[0].n as number;
}

const endpoints = [
  ["GET", "/movements"],
  ["GET", "/movements/summary?month=2026-11"],
  ["POST", "/movements"],
  ["GET", "/movements/00000000-0000-4000-8000-000000000001"],
  ["PUT", "/movements/00000000-0000-4000-8000-000000000001"],
  ["DELETE", "/movements/00000000-0000-4000-8000-000000000001"],
] as const;

describe("authentication", () => {
  it.each(endpoints)("%s %s rejects requests without a session", async (method, path) => {
    // Arrange
    const noCookie = undefined;

    // Act
    const response = await call(noCookie, method, path, {});

    // Assert
    expect(response.status).toBe(401);
  });
});

describe("recording expenses and income", () => {
  it("records a cash expense that lowers the balance and counts in its month", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const created = await record(user, expense(user, { description: "Groceries" }));

    // Assert
    expect(created).toMatchObject({
      type: "expense",
      description: "Groceries",
      account: { accountId: user.cash, currency: "ARS", amountMinor: 1_000_00 },
      person: null,
      installments: [
        { number: 1, periodMonth: "2026-11", amountMinor: 1_000_00, ownAmountMinor: 1_000_00 },
      ],
    });
    expect(await balanceOf(user, user.cash, "ARS")).toBe(-1_000_00);
  });

  it("records an income that raises the balance", async () => {
    // Arrange
    const user = await newUser();

    // Act
    await record(user, {
      type: "income",
      occurredOn: "2026-11-01",
      categoryId: user.salary,
      accountId: user.bank,
      currency: "ARS",
      amountMinor: 2_000_000_00,
    });

    // Assert
    expect(await balanceOf(user, user.bank, "ARS")).toBe(2_000_000_00);
  });

  it("records a dollar purchase on a dollar balance and counts it in dollars", async () => {
    // Arrange
    const user = await newUser();

    // Act
    await record(user, expense(user, { currency: "USD", amountMinor: 120_00 }));
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(await balanceOf(user, user.cash, "USD")).toBe(-120_00);
    expect(await balanceOf(user, user.cash, "ARS")).toBe(0);
    expect(summary.totals).toEqual([
      { currency: "ARS", inMinor: 0, outMinor: 0 },
      { currency: "USD", inMinor: 0, outMinor: 120_00 },
    ]);
  });

  it.each([
    ["an unknown type", { type: "gift" }],
    ["a missing category", { categoryId: undefined }],
    ["a fractional amount", { amountMinor: 10.5 }],
    ["a zero amount", { amountMinor: 0 }],
    ["an impossible date", { occurredOn: "2026-02-31" }],
    ["an unsupported currency", { currency: "EUR" }],
    ["zero installments", { installments: 0 }],
    ["an amount above the limit", { amountMinor: 1_000_000_000_001 }],
  ])("rejects %s", async (_label, changes) => {
    // Arrange
    const user = await newUser();

    // Act
    const response = await call(user.cookie, "POST", "/movements", expense(user, changes));

    // Assert
    expect(response.status).toBe(400);
  });

  it("rejects a body that is not JSON", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const response = await harness.app.request("/api/movements", {
      method: "POST",
      headers: { cookie: user.cookie },
      body: "nope",
    });

    // Assert
    expect(response.status).toBe(400);
  });

  it.each([
    [
      "installments on cash",
      (u: User) => expense(u, { installments: 3 }),
      "installments_not_allowed",
    ],
    [
      "a category of the other type",
      (u: User) => expense(u, { categoryId: u.salary }),
      "category_type_mismatch",
    ],
    [
      "a person as the paying account",
      (u: User) => expense(u, { accountId: u.juan }),
      "account_not_allowed",
    ],
  ])("rejects %s with a reason", async (_label, build, reason) => {
    // Arrange
    const user = await newUser();

    // Act
    const body = await ok(await call(user.cookie, "POST", "/movements", build(user)), 400);

    // Assert
    expect(body).toEqual({ error: "invalid_request", reason });
  });

  it("rejects an account that does not hold the currency", async () => {
    // Arrange
    const user = await newUser();
    const pesosOnly = (
      await ok(
        await call(user.cookie, "POST", "/accounts", {
          type: "cash",
          name: "Pesos only",
          currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
        }),
        201,
      )
    ).id;

    // Act
    const body = await ok(
      await call(
        user.cookie,
        "POST",
        "/movements",
        expense(user, { accountId: pesosOnly, currency: "USD" }),
      ),
      400,
    );

    // Assert
    expect(body.reason).toBe("currency_not_in_account");
  });
});

describe("card purchases", () => {
  it("assigns installments to the statements that follow a purchase after the closing day", async () => {
    // Arrange
    const user = await newUser();
    const body = expense(user, {
      accountId: user.visa,
      occurredOn: "2026-11-25",
      amountMinor: 900_000_00,
      installments: 3,
    });

    // Act
    const created = await record(user, body);
    const statements = await harness.pool.query(
      "select to_char(period_month, 'YYYY-MM') as month, to_char(closing_date, 'YYYY-MM-DD') as closing, to_char(due_date, 'YYYY-MM-DD') as due from statement where user_id = $1 order by period_month",
      [user.userId],
    );

    // Assert
    expect(
      created.installments.map((item: Json) => [item.number, item.periodMonth, item.amountMinor]),
    ).toEqual([
      [1, "2026-12", 300_000_00],
      [2, "2027-01", 300_000_00],
      [3, "2027-02", 300_000_00],
    ]);
    expect(created.installments.every((item: Json) => item.statementId !== null)).toBe(true);
    expect(statements.rows).toEqual([
      { month: "2026-12", closing: "2026-12-20", due: "2027-01-05" },
      { month: "2027-01", closing: "2027-01-20", due: "2027-02-05" },
      { month: "2027-02", closing: "2027-02-20", due: "2027-03-05" },
    ]);
    expect(await balanceOf(user, user.visa, "ARS")).toBe(-900_000_00);
  });

  it("keeps a purchase made on the closing day in the current statement", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const created = await record(
      user,
      expense(user, { accountId: user.visa, occurredOn: "2026-11-20" }),
    );

    // Assert
    expect(created.installments[0].periodMonth).toBe("2026-11");
  });

  it("gives the rounding remainder to the first installment", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const created = await record(
      user,
      expense(user, { accountId: user.visa, amountMinor: 100, installments: 3 }),
    );

    // Assert
    expect(created.installments.map((item: Json) => item.amountMinor)).toEqual([34, 33, 33]);
  });

  it("reuses statements and honours a corrected closing date", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { accountId: user.visa, occurredOn: "2026-11-10" }));
    await harness.pool.query(
      "update statement set closing_date = '2026-11-24', due_date = '2026-12-04' where user_id = $1 and period_month = '2026-11-01'",
      [user.userId],
    );

    // Act
    const late = await record(
      user,
      expense(user, { accountId: user.visa, occurredOn: "2026-11-23" }),
    );

    // Assert
    expect(late.installments[0].periodMonth).toBe("2026-11");
    expect(await count("statement", user.userId)).toBe(1);
  });

  it("counts each installment in the month of its statement", async () => {
    // Arrange
    const user = await newUser();
    await record(
      user,
      expense(user, {
        accountId: user.visa,
        amountMinor: 900_00,
        installments: 3,
        occurredOn: "2026-11-25",
      }),
    );

    // Act
    const november = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));
    const january = await ok(await call(user.cookie, "GET", "/movements/summary?month=2027-01"));

    // Assert
    expect(november.totals[0].outMinor).toBe(0);
    expect(january.totals[0].outMinor).toBe(300_00);
  });

  it("ignores a stored statement with inconsistent dates instead of failing", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { accountId: user.visa, occurredOn: "2026-11-10" }));
    await harness.pool.query("update statement set due_date = closing_date where user_id = $1", [
      user.userId,
    ]);

    // Act
    const created = await record(
      user,
      expense(user, { accountId: user.visa, occurredOn: "2026-11-12" }),
    );

    // Assert
    expect(created.installments[0].periodMonth).toBe("2026-11");
  });

  it("rejects installments on a card without closing and due days", async () => {
    // Arrange
    const user = await newUser();
    const bare = (
      await ok(
        await call(user.cookie, "POST", "/accounts", {
          type: "credit_card",
          name: "Bare card",
          currencies: both,
        }),
        201,
      )
    ).id;

    // Act
    const body = await ok(
      await call(user.cookie, "POST", "/movements", expense(user, { accountId: bare })),
      400,
    );

    // Assert
    expect(body.reason).toBe("card_without_schedule");
  });
});

describe("transfers and exchange", () => {
  it("moves money between accounts without touching month totals", async () => {
    // Arrange
    const user = await newUser();
    const body = {
      type: "transfer",
      occurredOn: "2026-11-10",
      from: { accountId: user.cash, currency: "ARS", amountMinor: 500_00 },
      to: { accountId: user.bank, currency: "ARS", amountMinor: 500_00 },
    };

    // Act
    const created = await record(user, body);
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(created).toMatchObject({
      type: "transfer",
      categoryId: null,
      from: { accountId: user.cash, amountMinor: 500_00 },
      to: { accountId: user.bank, amountMinor: 500_00 },
      installments: [],
    });
    expect(await balanceOf(user, user.cash, "ARS")).toBe(-500_00);
    expect(await balanceOf(user, user.bank, "ARS")).toBe(500_00);
    expect(summary.totals).toEqual([
      { currency: "ARS", inMinor: 0, outMinor: 0 },
      { currency: "USD", inMinor: 0, outMinor: 0 },
    ]);
  });

  it("records a currency exchange inside one account with two amounts", async () => {
    // Arrange
    const user = await newUser();
    const body = {
      type: "transfer",
      occurredOn: "2026-11-10",
      from: { accountId: user.bank, currency: "ARS", amountMinor: 1_230_000_00 },
      to: { accountId: user.bank, currency: "USD", amountMinor: 1_000_00 },
    };

    // Act
    await record(user, body);

    // Assert
    expect(await balanceOf(user, user.bank, "ARS")).toBe(-1_230_000_00);
    expect(await balanceOf(user, user.bank, "USD")).toBe(1_000_00);
  });

  it.each([
    [
      "the same account and currency",
      (u: User) => ({
        from: { accountId: u.cash, currency: "ARS", amountMinor: 1_00 },
        to: { accountId: u.cash, currency: "ARS", amountMinor: 1_00 },
      }),
      "transfer_same_account",
    ],
    [
      "different amounts in one currency",
      (u: User) => ({
        from: { accountId: u.cash, currency: "ARS", amountMinor: 1_00 },
        to: { accountId: u.bank, currency: "ARS", amountMinor: 2_00 },
      }),
      "transfer_amount_mismatch",
    ],
  ])("rejects %s", async (_label, legs, reason) => {
    // Arrange
    const user = await newUser();
    const body = { type: "transfer", occurredOn: "2026-11-10", ...legs(user) };

    // Act
    const response = await ok(await call(user.cookie, "POST", "/movements", body), 400);

    // Assert
    expect(response.reason).toBe(reason);
  });

  it("rejects an exchange inside a person's account", async () => {
    // Arrange
    const user = await newUser();
    const body = {
      type: "transfer",
      occurredOn: "2026-11-10",
      from: { accountId: user.juan, currency: "ARS", amountMinor: 1_00 },
      to: { accountId: user.juan, currency: "USD", amountMinor: 1_00 },
    };

    // Act
    const response = await ok(await call(user.cookie, "POST", "/movements", body), 400);

    // Assert
    expect(response.reason).toBe("transfer_same_account");
  });

  it("treats a loan to a person as a transfer that is not an expense", async () => {
    // Arrange
    const user = await newUser();
    const body = {
      type: "transfer",
      occurredOn: "2026-11-10",
      from: { accountId: user.cash, currency: "ARS", amountMinor: 700_00 },
      to: { accountId: user.juan, currency: "ARS", amountMinor: 700_00 },
    };

    // Act
    await record(user, body);
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(await balanceOf(user, user.juan, "ARS", "/people")).toBe(700_00);
    expect(summary.totals[0]).toEqual({ currency: "ARS", inMinor: 0, outMinor: 0 });
  });
});

describe("purchases for other people", () => {
  it("posts the other person's part to their account and keeps the user's share", async () => {
    // Arrange
    const user = await newUser();
    const body = expense(user, {
      accountId: user.visa,
      amountMinor: 160_000_00,
      installments: 2,
      occurredOn: "2026-11-10",
      person: { personId: user.juan, ownAmountMinor: 80_000_00 },
    });

    // Act
    const created = await record(user, body);
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(created.person).toEqual({ personId: user.juan, ownAmountMinor: 80_000_00 });
    expect(
      created.installments.map((item: Json) => [item.amountMinor, item.ownAmountMinor]),
    ).toEqual([
      [80_000_00, 40_000_00],
      [80_000_00, 40_000_00],
    ]);
    expect(await balanceOf(user, user.visa, "ARS")).toBe(-160_000_00);
    expect(await balanceOf(user, user.juan, "ARS", "/people")).toBe(80_000_00);
    expect(summary.totals[0].outMinor).toBe(40_000_00);
  });

  it("owes the whole purchase to the person when nothing is the user's own", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const created = await record(
      user,
      expense(user, { person: { personId: user.juan, ownAmountMinor: 0 } }),
    );
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(created.installments[0].ownAmountMinor).toBe(0);
    expect(await balanceOf(user, user.juan, "ARS", "/people")).toBe(1_000_00);
    expect(summary.totals[0].outMinor).toBe(0);
  });

  it("rejects a share that is the whole amount", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const body = await ok(
      await call(
        user.cookie,
        "POST",
        "/movements",
        expense(user, { person: { personId: user.juan, ownAmountMinor: 1_000_00 } }),
      ),
      400,
    );

    // Assert
    expect(body.reason).toBe("person_share_invalid");
  });

  it("rejects a money account used as the person", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const body = await ok(
      await call(
        user.cookie,
        "POST",
        "/movements",
        expense(user, { person: { personId: user.bank, ownAmountMinor: 0 } }),
      ),
      400,
    );

    // Assert
    expect(body.reason).toBe("person_not_found");
  });
});

describe("editing and deleting", () => {
  it("regenerates postings and installments in one replacement", async () => {
    // Arrange
    const user = await newUser();
    const created = await record(
      user,
      expense(user, {
        accountId: user.visa,
        amountMinor: 900_00,
        installments: 3,
        occurredOn: "2026-11-25",
      }),
    );

    // Act
    const edited = await ok(
      await call(
        user.cookie,
        "PUT",
        `/movements/${created.id}`,
        expense(user, {
          accountId: user.visa,
          amountMinor: 600_00,
          installments: 2,
          occurredOn: "2026-11-10",
          description: "Edited",
        }),
      ),
    );

    // Assert
    expect(edited.id).toBe(created.id);
    expect(edited.description).toBe("Edited");
    expect(edited.installments.map((item: Json) => [item.periodMonth, item.amountMinor])).toEqual([
      ["2026-11", 300_00],
      ["2026-12", 300_00],
    ]);
    expect(await count("installment", user.userId)).toBe(2);
    expect(await count("posting", user.userId)).toBe(1);
    expect(await balanceOf(user, user.visa, "ARS")).toBe(-600_00);
  });

  it("moves a card purchase to a cash account and drops its statement links", async () => {
    // Arrange
    const user = await newUser();
    const created = await record(
      user,
      expense(user, { accountId: user.visa, amountMinor: 900_00, installments: 3 }),
    );

    // Act
    const edited = await ok(
      await call(
        user.cookie,
        "PUT",
        `/movements/${created.id}`,
        expense(user, { amountMinor: 900_00 }),
      ),
    );

    // Assert
    expect(edited.installments).toHaveLength(1);
    expect(edited.installments[0].statementId).toBeNull();
    expect(await balanceOf(user, user.visa, "ARS")).toBe(0);
    expect(await balanceOf(user, user.cash, "ARS")).toBe(-900_00);
  });

  it("changes the type of a movement from expense to transfer", async () => {
    // Arrange
    const user = await newUser();
    const created = await record(user, expense(user));

    // Act
    const edited = await ok(
      await call(user.cookie, "PUT", `/movements/${created.id}`, {
        type: "transfer",
        occurredOn: "2026-11-10",
        from: { accountId: user.cash, currency: "ARS", amountMinor: 1_00 },
        to: { accountId: user.bank, currency: "ARS", amountMinor: 1_00 },
      }),
    );

    // Assert
    expect(edited.type).toBe("transfer");
    expect(await count("installment", user.userId)).toBe(0);
    expect(await count("posting", user.userId)).toBe(2);
  });

  it("lets an edit keep an account and a category that were deactivated afterwards", async () => {
    // Arrange
    const user = await newUser();
    const created = await record(user, expense(user));
    await ok(await call(user.cookie, "POST", `/accounts/${user.cash}/deactivate`));
    await harness.pool.query("update category set is_active = false where id = $1", [user.food]);

    // Act
    const edited = await call(
      user.cookie,
      "PUT",
      `/movements/${created.id}`,
      expense(user, { description: "Fixed typo" }),
    );
    const fresh = await call(user.cookie, "POST", "/movements", expense(user));

    // Assert
    expect(edited.status).toBe(200);
    expect(fresh.status).toBe(400);
  });

  it("deletes a movement with its postings and installments and restores the balance", async () => {
    // Arrange
    const user = await newUser();
    const created = await record(
      user,
      expense(user, { accountId: user.visa, amountMinor: 900_00, installments: 3 }),
    );

    // Act
    const removed = await call(user.cookie, "DELETE", `/movements/${created.id}`);
    const again = await call(user.cookie, "DELETE", `/movements/${created.id}`);

    // Assert
    expect(removed.status).toBe(204);
    expect(again.status).toBe(404);
    expect(await count("installment", user.userId)).toBe(0);
    expect(await count("posting", user.userId)).toBe(0);
    expect(await balanceOf(user, user.visa, "ARS")).toBe(0);
  });

  it("returns 404 for malformed ids and keeps a rejected edit from changing anything", async () => {
    // Arrange
    const user = await newUser();
    const created = await record(user, expense(user));

    // Act
    const malformed = await call(user.cookie, "PUT", "/movements/nope", expense(user));
    const malformedDelete = await call(user.cookie, "DELETE", "/movements/nope");
    const malformedGet = await call(user.cookie, "GET", "/movements/nope");
    const rejected = await call(
      user.cookie,
      "PUT",
      `/movements/${created.id}`,
      expense(user, { installments: 4 }),
    );
    const invalid = await call(user.cookie, "PUT", `/movements/${created.id}`, { type: "gift" });
    const after = await ok(await call(user.cookie, "GET", `/movements/${created.id}`));

    // Assert
    expect([malformed.status, malformedDelete.status, malformedGet.status]).toEqual([
      404, 404, 404,
    ]);
    expect([rejected.status, invalid.status]).toEqual([400, 400]);
    expect(after.installments).toHaveLength(1);
  });

  it("blocks deleting a movement that a recurring occurrence confirmed", async () => {
    // Arrange
    const user = await newUser();
    const created = await record(user, expense(user));
    const recurring = await harness.pool.query(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, amount_minor, currency, account_id, category_id, starts_on) values ($1, 'expense', 'monthly', 10, 'fixed', 100, 'ARS', $2, $3, '2026-01-01') returning id",
      [user.userId, user.cash, user.food],
    );
    await harness.pool.query(
      "insert into recurring_occurrence (user_id, recurring_id, due_on, status, movement_id) values ($1, $2, '2026-11-10', 'confirmed', $3)",
      [user.userId, recurring.rows[0].id, created.id],
    );

    // Act
    const response = await call(user.cookie, "DELETE", `/movements/${created.id}`);

    // Assert
    expect(response.status).toBe(409);
  });
});

describe("accent-insensitive search", () => {
  let user: User;

  beforeAll(async () => {
    user = await newUser();
    await record(
      user,
      expense(user, {
        occurredOn: "2026-12-01",
        description: "Café con leche",
        amountMinor: 2_500_00,
      }),
    );
    await record(
      user,
      expense(user, {
        occurredOn: "2026-12-02",
        description: "Niño feliz",
        amountMinor: 400_00,
      }),
    );
  });

  async function list(query: string) {
    const page = await ok(await call(user.cookie, "GET", `/movements?${query}`));
    return (page.items as Json[]).map((item) => item.description as string);
  }

  it.each([
    ["cafe", ["Café con leche"]],
    ["CAFÉ", ["Café con leche"]],
    ["Cafe", ["Café con leche"]],
    ["leche", ["Café con leche"]],
    ["ni%C3%B1o", ["Niño feliz"]],
    ["NINO", ["Niño feliz"]],
    ["zzz", []],
  ])("searches %s ignoring accents and case", async (text, expected) => {
    // Arrange
    const query = `q=${text}&from=2026-12-01&to=2026-12-31`;

    // Act
    const descriptions = await list(query);

    // Assert
    expect(descriptions).toEqual(expected);
  });

  it("combines the accent-insensitive search with other filters", async () => {
    // Arrange
    const query = "q=cafe&type=expense&currency=ARS&minAmountMinor=100000&from=2026-12-01";

    // Act
    const descriptions = await list(query);

    // Assert
    expect(descriptions).toEqual(["Café con leche"]);
  });

  it("never finds the movements of another user", async () => {
    // Arrange
    const stranger = await newUser();
    await record(
      stranger,
      expense(stranger, { occurredOn: "2026-12-02", description: "Café ajeno", amountMinor: 1_00 }),
    );

    // Act
    const mine = await list("q=cafe");
    const theirs = await ok(await call(stranger.cookie, "GET", "/movements?q=cafe"));

    // Assert
    expect(mine).not.toContain("Café ajeno");
    expect((theirs.items as Json[]).map((item) => item.description)).toEqual(["Café ajeno"]);
  });
});

describe("listing and filtering", () => {
  let user: User;

  beforeAll(async () => {
    user = await newUser();
    await record(
      user,
      expense(user, {
        occurredOn: "2026-10-05",
        description: "Plumber visit",
        amountMinor: 5_000_00,
      }),
    );
    await record(
      user,
      expense(user, {
        occurredOn: "2026-11-02",
        description: "100% organic_veg",
        categoryId: user.otherFood,
        amountMinor: 300_00,
      }),
    );
    await record(
      user,
      expense(user, {
        occurredOn: "2026-11-03",
        accountId: user.bank,
        currency: "USD",
        amountMinor: 20_00,
        description: "Dollar thing",
      }),
    );
    await record(
      user,
      expense(user, {
        occurredOn: "2026-11-04",
        accountId: user.visa,
        person: { personId: user.juan, ownAmountMinor: 0 },
        amountMinor: 800_00,
        description: "For Juan",
      }),
    );
    await record(user, {
      type: "income",
      occurredOn: "2026-11-05",
      categoryId: user.salary,
      accountId: user.bank,
      currency: "ARS",
      amountMinor: 90_000_00,
      description: "Pay",
    });
    await record(user, {
      type: "transfer",
      occurredOn: "2026-11-06",
      from: { accountId: user.bank, currency: "ARS", amountMinor: 10_000_00 },
      to: { accountId: user.cash, currency: "ARS", amountMinor: 10_000_00 },
      description: "Withdraw",
    });
  });

  async function list(query: string) {
    const page = await ok(await call(user.cookie, "GET", `/movements?${query}`));
    return (page.items as Json[]).map((item) => item.description as string);
  }

  it("lists newest first", async () => {
    // Arrange
    const query = "";

    // Act
    const descriptions = await list(query);

    // Assert
    expect(descriptions).toEqual([
      "Withdraw",
      "Pay",
      "For Juan",
      "Dollar thing",
      "100% organic_veg",
      "Plumber visit",
    ]);
  });

  it.each([
    ["text on the description", "q=plumber", ["Plumber visit"]],
    ["a literal percent sign in the text", "q=100%25", ["100% organic_veg"]],
    ["a literal underscore in the text", "q=c_v", ["100% organic_veg"]],
    ["a period", "from=2026-11-03&to=2026-11-04", ["For Juan", "Dollar thing"]],
    ["a type", "type=income", ["Pay"]],
    ["an account", "accountId=BANK", ["Withdraw", "Pay", "Dollar thing"]],
    ["a person", "personId=JUAN", ["For Juan"]],
    ["a category", "categoryId=OTHER", ["100% organic_veg"]],
    ["a currency", "currency=USD", ["Dollar thing"]],
    ["an amount range", "minAmountMinor=500000&maxAmountMinor=600000", ["Plumber visit"]],
    ["a minimum amount only", "minAmountMinor=9000000", ["Pay"]],
    ["combined filters", "q=for&type=expense&currency=ARS", ["For Juan"]],
  ])("filters by %s", async (_label, template, expected) => {
    // Arrange
    const query = template
      .replace("BANK", user.bank)
      .replace("JUAN", user.juan)
      .replace("OTHER", user.otherFood);

    // Act
    const descriptions = await list(query);

    // Assert
    expect(descriptions).toEqual(expected);
  });

  it("applies the amount range in the selected currency", async () => {
    // Arrange
    const dollars = "currency=USD&minAmountMinor=1000&maxAmountMinor=3000";
    const pesos = "currency=ARS&minAmountMinor=1000&maxAmountMinor=3000";

    // Act
    const inDollars = await list(dollars);
    const inPesos = await list(pesos);

    // Assert
    expect(inDollars).toEqual(["Dollar thing"]);
    expect(inPesos).toEqual([]);
  });

  it("filters by the group of the category", async () => {
    // Arrange
    const query = `groupId=${user.groupId}&type=expense`;

    // Act
    const descriptions = await list(query);

    // Assert
    expect(descriptions).toHaveLength(4);
    expect(descriptions).not.toContain("Pay");
  });

  it("paginates and reports whether more remain", async () => {
    // Arrange
    const first = await ok(await call(user.cookie, "GET", "/movements?limit=4"));

    // Act
    const second = await ok(await call(user.cookie, "GET", "/movements?limit=4&offset=4"));

    // Assert
    expect(first.items).toHaveLength(4);
    expect(first.hasMore).toBe(true);
    expect(second.items).toHaveLength(2);
    expect(second.hasMore).toBe(false);
  });

  it.each([
    "limit=0",
    "limit=101",
    "offset=-1",
    "type=gift",
    "from=2026-13-01",
    "accountId=nope",
    "from=2026-12-01&to=2026-11-01",
    "minAmountMinor=10&maxAmountMinor=5",
    "maxAmountMinor=99999999999999999999",
    "offset=1000000000000000000000",
    "minAmountMinor=",
  ])("rejects the query %s", async (query) => {
    // Arrange
    const path = `/movements?${query}`;

    // Act
    const response = await call(user.cookie, "GET", path);

    // Assert
    expect(response.status).toBe(400);
  });

  it("rejects a malformed month in the summary", async () => {
    // Arrange
    const path = "/movements/summary?month=2026-13";

    // Act
    const response = await call(user.cookie, "GET", path);

    // Assert
    expect(response.status).toBe(400);
  });

  it("adds up own amounts per currency for the month and ignores transfers and loans", async () => {
    // Arrange
    const path = "/movements/summary?month=2026-11";

    // Act
    const summary = await ok(await call(user.cookie, "GET", path));

    // Assert
    expect(summary).toEqual({
      month: "2026-11",
      totals: [
        { currency: "ARS", inMinor: 90_000_00, outMinor: 300_00 },
        { currency: "USD", inMinor: 0, outMinor: 20_00 },
      ],
    });
  });
});

describe("data isolation between users", () => {
  it("hides another user's movement on every operation", async () => {
    // Arrange
    const owner = await newUser();
    const intruder = await newUser();
    const created = await record(owner, expense(owner));

    // Act
    const read = await call(intruder.cookie, "GET", `/movements/${created.id}`);
    const edit = await call(
      intruder.cookie,
      "PUT",
      `/movements/${created.id}`,
      expense(intruder, { description: "Hijacked" }),
    );
    const remove = await call(intruder.cookie, "DELETE", `/movements/${created.id}`);
    const list = await ok(await call(intruder.cookie, "GET", "/movements"));
    const summary = await ok(
      await call(intruder.cookie, "GET", "/movements/summary?month=2026-11"),
    );
    const untouched = await ok(await call(owner.cookie, "GET", `/movements/${created.id}`));

    // Assert
    expect([read.status, edit.status, remove.status]).toEqual([404, 404, 404]);
    expect(list.items).toEqual([]);
    expect(summary.totals[0].outMinor).toBe(0);
    expect(untouched.description).toBeNull();
  });

  it("does not let a user record against another user's account, category or person", async () => {
    // Arrange
    const owner = await newUser();
    const intruder = await newUser();

    // Act
    const foreignAccount = await call(
      intruder.cookie,
      "POST",
      "/movements",
      expense(intruder, { accountId: owner.cash }),
    );
    const foreignCategory = await call(
      intruder.cookie,
      "POST",
      "/movements",
      expense(intruder, { categoryId: owner.food }),
    );
    const foreignPerson = await call(
      intruder.cookie,
      "POST",
      "/movements",
      expense(intruder, { person: { personId: owner.juan, ownAmountMinor: 0 } }),
    );
    const foreignTransfer = await call(intruder.cookie, "POST", "/movements", {
      type: "transfer",
      occurredOn: "2026-11-10",
      from: { accountId: intruder.cash, currency: "ARS", amountMinor: 1_00 },
      to: { accountId: owner.cash, currency: "ARS", amountMinor: 1_00 },
    });

    // Assert
    expect(foreignAccount.status).toBe(400);
    expect(foreignCategory.status).toBe(400);
    expect(foreignPerson.status).toBe(400);
    expect(foreignTransfer.status).toBe(400);
    expect(await count("movement", owner.userId)).toBe(0);
    expect(await count("posting", owner.userId)).toBe(0);
  });

  it("does not let an edit repoint a movement at another user's account", async () => {
    // Arrange
    const owner = await newUser();
    const intruder = await newUser();
    const mine = await record(intruder, expense(intruder));

    // Act
    const response = await call(
      intruder.cookie,
      "PUT",
      `/movements/${mine.id}`,
      expense(intruder, { accountId: owner.cash }),
    );
    const after = await ok(await call(intruder.cookie, "GET", `/movements/${mine.id}`));

    // Assert
    expect(response.status).toBe(400);
    expect(after.account.accountId).toBe(intruder.cash);
  });

  it("keeps filters from leaking another user's rows", async () => {
    // Arrange
    const owner = await newUser();
    const intruder = await newUser();
    await record(owner, expense(owner, { description: "Secret" }));

    // Act
    const search = await ok(await call(intruder.cookie, "GET", "/movements?q=secret"));
    const byAccount = await ok(
      await call(intruder.cookie, "GET", `/movements?accountId=${owner.cash}`),
    );

    // Assert
    expect(search.items).toEqual([]);
    expect(byAccount.items).toEqual([]);
  });
});
