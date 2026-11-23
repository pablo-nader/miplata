import type { CategoriesResponse } from "@miplata/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthHarness } from "../test/auth-harness";

type Harness = Awaited<ReturnType<typeof createAuthHarness>>;
type Json = ReturnType<typeof JSON.parse>;

let harness: Harness;
let counter = 0;

beforeAll(async () => {
  harness = await createAuthHarness();
});

afterAll(async () => {
  await harness.close();
});

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
  const body = (await response.json()) as Json;
  expect(response.status, JSON.stringify(body)).toBe(status);
  return body;
}

const both = [
  { currency: "ARS", openingBalanceMinor: 0 },
  { currency: "USD", openingBalanceMinor: 0 },
];

async function newUser() {
  counter += 1;
  const userId = await harness.signUpWithGoogle(`statements-${counter}@example.com`);
  const cookie = await harness.cookieFor(userId);
  const account = async (body: Json) =>
    (await ok(await call(cookie, "POST", "/accounts", body), 201)).id as string;
  const catalog = (await ok(await call(cookie, "GET", "/categories"))) as CategoriesResponse;
  const named = (key: string) =>
    catalog.expenseGroups.flatMap((group) => group.categories).find((item) => item.nameKey === key)
      ?.id as string;
  const group = catalog.expenseGroups[0];
  return {
    cookie,
    userId,
    bank: await account({ type: "bank", name: "Bank", currencies: both }),
    pesosBank: await account({
      type: "bank",
      name: "Pesos bank",
      currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    }),
    visa: await account({
      type: "credit_card",
      name: "Visa",
      closingDay: 27,
      dueDay: 5,
      currencies: both,
    }),
    juan: (await ok(await call(cookie, "POST", "/people", { name: "Juan", currencies: both }), 201))
      .id as string,
    food: group?.categories[0]?.id as string,
    interest: named("defaults.category.interest"),
    adjustment: named("defaults.category.adjustment"),
  };
}

type User = Awaited<ReturnType<typeof newUser>>;

function purchase(user: User, changes: Json = {}) {
  return {
    type: "expense",
    occurredOn: "2026-11-10",
    categoryId: user.food,
    accountId: user.visa,
    currency: "ARS",
    amountMinor: 100_00,
    ...changes,
  };
}

async function record(user: User, body: Json) {
  return ok(await call(user.cookie, "POST", "/movements", body), 201);
}

async function statements(user: User, accountId = user.visa) {
  const list = await ok(await call(user.cookie, "GET", `/statements?accountId=${accountId}`));
  return list.items as Json[];
}

async function statementOf(user: User, month: string) {
  const found = (await statements(user)).find((item) => item.periodMonth === month);
  return ok(await call(user.cookie, "GET", `/statements/${found?.id}`));
}

function totalsOf(detail: Json, currency = "ARS") {
  return (detail.totals as Json[]).find((item) => item.currency === currency) as Json;
}

async function balanceOf(user: User, accountId: string, currency: string) {
  const account = await ok(await call(user.cookie, "GET", `/accounts/${accountId}`));
  return (account.currencies as Json[]).find((entry) => entry.currency === currency)
    ?.balanceMinor as number;
}

function charge(user: User, changes: Json = {}) {
  return { categoryId: user.interest, currency: "ARS", amountMinor: 36_600_00, ...changes };
}

const ID = "00000000-0000-4000-8000-000000000001";

const endpoints = [
  ["GET", "/statements?accountId=00000000-0000-4000-8000-000000000001"],
  ["GET", `/statements/${ID}`],
  ["PATCH", `/statements/${ID}`],
  ["PUT", `/statements/${ID}/bank-figures`],
  ["POST", `/statements/${ID}/charges`],
  ["PUT", `/statements/${ID}/charges/${ID}`],
  ["DELETE", `/statements/${ID}/charges/${ID}`],
  ["POST", `/statements/${ID}/payments`],
  ["POST", `/statements/${ID}/adjustment`],
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

describe("listing and reading statements", () => {
  it("opens the statement the card is in today and keeps listing it once", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const first = await statements(user);
    const second = await statements(user);

    // Assert
    expect(first).toHaveLength(1);
    expect(first[0]).toMatchObject({
      periodMonth: "2026-11",
      closingDate: "2026-11-27",
      dueDate: "2026-12-05",
    });
    expect(second).toHaveLength(1);
    expect(totalsOf(first[0] as Json).totalMinor).toBe(0);
  });

  it("lists the statements a purchase in installments creates, oldest first", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 900_000_00, installments: 3 }));

    // Act
    const list = await statements(user);

    // Assert
    expect(list.map((item) => item.periodMonth)).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(list.map((item) => totalsOf(item).totalMinor)).toEqual([
      300_000_00, 600_000_00, 900_000_00,
    ]);
  });

  it("breaks a statement down into purchases, other people's installments and charges", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 348_300_00 }));
    await record(
      user,
      purchase(user, {
        amountMinor: 120_000_00,
        person: { personId: user.juan, ownAmountMinor: 0 },
        description: "For Juan",
      }),
    );
    const before = await statementOf(user, "2026-11");
    await ok(
      await call(user.cookie, "POST", `/statements/${before.id}/charges`, charge(user)),
      201,
    );

    // Act
    const detail = await statementOf(user, "2026-11");

    // Assert
    expect(totalsOf(detail)).toMatchObject({
      previousBalanceMinor: 0,
      ownMinor: 348_300_00,
      othersMinor: 120_000_00,
      chargesMinor: 36_600_00,
      paymentsMinor: 0,
      totalMinor: 504_900_00,
    });
    expect(detail.purchases).toHaveLength(1);
    expect(detail.others).toEqual([
      expect.objectContaining({
        description: "For Juan",
        personId: user.juan,
        amountMinor: 120_000_00,
      }),
    ]);
    expect(detail.charges).toEqual([
      expect.objectContaining({
        categoryId: user.interest,
        amountMinor: 36_600_00,
        isAdjustment: false,
      }),
    ]);
  });

  it("splits a shared purchase between the user's part and the other person's part", async () => {
    // Arrange
    const user = await newUser();
    await record(
      user,
      purchase(user, {
        amountMinor: 200_00,
        person: { personId: user.juan, ownAmountMinor: 80_00 },
      }),
    );

    // Act
    const detail = await statementOf(user, "2026-11");

    // Assert
    expect(totalsOf(detail)).toMatchObject({
      ownMinor: 80_00,
      othersMinor: 120_00,
      totalMinor: 200_00,
    });
    expect(detail.purchases[0]).toMatchObject({ ownAmountMinor: 80_00 });
    expect(detail.others[0]).toMatchObject({ amountMinor: 120_00, personId: user.juan });
  });

  it("keeps the dollar part apart from the peso part", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 504_900_00 }));
    await record(user, purchase(user, { currency: "USD", amountMinor: 35_00 }));

    // Act
    const detail = await statementOf(user, "2026-11");

    // Assert
    expect(totalsOf(detail, "ARS").totalMinor).toBe(504_900_00);
    expect(totalsOf(detail, "USD").totalMinor).toBe(35_00);
  });

  it("answers 404 for a card of another user, an account that is not a card and bad ids", async () => {
    // Arrange
    const owner = await newUser();
    const stranger = await newUser();

    // Act
    const foreign = await call(stranger.cookie, "GET", `/statements?accountId=${owner.visa}`);
    const notACard = await call(owner.cookie, "GET", `/statements?accountId=${owner.bank}`);
    const malformed = await call(owner.cookie, "GET", "/statements/not-an-id");

    // Assert
    expect(foreign.status).toBe(404);
    expect(notACard.status).toBe(404);
    expect(malformed.status).toBe(404);
  });
});

describe("payments and the previous balance", () => {
  it("carries what a partial payment left unpaid into the next statement", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 200_00, installments: 2 }));
    const november = await statementOf(user, "2026-11");

    // Act
    const paid = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
        fromAccountId: user.bank,
        occurredOn: "2026-12-05",
        arsMinor: 40_00,
      }),
      201,
    );

    // Assert
    expect(totalsOf(paid)).toMatchObject({ paymentsMinor: 40_00, totalMinor: 60_00 });
    expect(paid.payments).toEqual([
      expect.objectContaining({ currency: "ARS", amountMinor: 40_00, occurredOn: "2026-12-05" }),
    ]);
    const december = await statementOf(user, "2026-12");
    expect(totalsOf(december)).toMatchObject({ previousBalanceMinor: 60_00, totalMinor: 160_00 });
    expect(await balanceOf(user, user.bank, "ARS")).toBe(-40_00);
    expect(await balanceOf(user, user.visa, "ARS")).toBe(-160_00);
  });

  it("pays pesos and dollars in one call, each with its own transfer", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 504_900_00 }));
    await record(user, purchase(user, { currency: "USD", amountMinor: 35_00 }));
    const november = await statementOf(user, "2026-11");

    // Act
    const paid = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
        fromAccountId: user.bank,
        occurredOn: "2026-12-05",
        arsMinor: 504_900_00,
        usdMinor: 35_00,
      }),
      201,
    );

    // Assert
    expect(totalsOf(paid, "ARS").totalMinor).toBe(0);
    expect(totalsOf(paid, "USD").totalMinor).toBe(0);
    expect(paid.payments).toHaveLength(2);
    expect(await balanceOf(user, user.bank, "ARS")).toBe(-504_900_00);
    expect(await balanceOf(user, user.bank, "USD")).toBe(-35_00);
    expect(await balanceOf(user, user.visa, "USD")).toBe(0);
  });

  it("pays the dollar part with pesos as an exchange", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { currency: "USD", amountMinor: 35_00 }));
    const november = await statementOf(user, "2026-11");

    // Act
    const paid = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
        fromAccountId: user.bank,
        occurredOn: "2026-12-05",
        usdMinor: 35_00,
        usdSource: "ars",
        usdSourceAmountMinor: 43_050_00,
      }),
      201,
    );

    // Assert
    expect(totalsOf(paid, "USD")).toMatchObject({ paymentsMinor: 35_00, totalMinor: 0 });
    expect(await balanceOf(user, user.bank, "ARS")).toBe(-43_050_00);
    expect(await balanceOf(user, user.bank, "USD")).toBe(0);
    expect(await balanceOf(user, user.visa, "USD")).toBe(0);
  });

  it("does not count a payment as an expense", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user));
    const november = await statementOf(user, "2026-11");

    // Act
    await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
        fromAccountId: user.bank,
        occurredOn: "2026-12-05",
        arsMinor: 100_00,
      }),
      201,
    );
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-12"));

    // Assert
    expect(summary.totals).toEqual([
      { currency: "ARS", inMinor: 0, outMinor: 0 },
      { currency: "USD", inMinor: 0, outMinor: 0 },
    ]);
  });

  it.each([
    [
      "a person as the source",
      (user: User) => ({ fromAccountId: user.juan, arsMinor: 10_00 }),
      "account_not_allowed",
    ],
    [
      "a card as the source",
      (user: User) => ({ fromAccountId: user.visa, arsMinor: 10_00 }),
      "account_not_allowed",
    ],
    [
      "a source without dollars",
      (user: User) => ({ fromAccountId: user.pesosBank, usdMinor: 10_00 }),
      "currency_not_in_account",
    ],
  ])("rejects %s", async (_label, body, reason) => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;

    // Act
    const response = await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
      occurredOn: "2026-12-05",
      ...body(user),
    });

    // Assert
    expect(await ok(response, 400)).toEqual({ error: "invalid_request", reason });
  });

  it("rejects a payment from a deactivated account", async () => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;
    await ok(await call(user.cookie, "POST", `/accounts/${user.bank}/deactivate`), 200);

    // Act
    const response = await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
      fromAccountId: user.bank,
      occurredOn: "2026-12-05",
      arsMinor: 10_00,
    });

    // Assert
    expect(await ok(response, 400)).toEqual({
      error: "invalid_request",
      reason: "account_inactive",
    });
  });

  it("leaves a transfer to the card made outside Pay statement out of every statement", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    await record(user, {
      type: "transfer",
      occurredOn: "2026-12-01",
      from: { accountId: user.bank, currency: "ARS", amountMinor: 40_00 },
      to: { accountId: user.visa, currency: "ARS", amountMinor: 40_00 },
    });

    // Act
    const november = await statementOf(user, "2026-11");

    // Assert
    expect(totalsOf(november)).toMatchObject({ paymentsMinor: 0, totalMinor: 100_00 });
    expect(await balanceOf(user, user.visa, "ARS")).toBe(-60_00);
  });

  it("rejects a payment without any amount", async () => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;

    // Act
    const response = await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
      fromAccountId: user.bank,
      occurredOn: "2026-12-05",
    });

    // Assert
    expect(response.status).toBe(400);
  });
});

describe("deactivated cards", () => {
  it("still accepts a payment so a closed card can be paid off", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    const november = await statementOf(user, "2026-11");
    await ok(await call(user.cookie, "POST", `/accounts/${user.visa}/deactivate`), 200);

    // Act
    const paid = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
        fromAccountId: user.bank,
        occurredOn: "2026-12-05",
        arsMinor: 100_00,
      }),
      201,
    );

    // Assert
    expect(totalsOf(paid).totalMinor).toBe(0);
    expect(await balanceOf(user, user.visa, "ARS")).toBe(0);
  });
});

describe("correcting a statement's dates", () => {
  it("moves the purchases made after the new closing date to the next statement", async () => {
    // Arrange
    const user = await newUser();
    await record(
      user,
      purchase(user, { occurredOn: "2026-11-26", amountMinor: 200_00, installments: 2 }),
    );
    await record(user, purchase(user, { occurredOn: "2026-11-10", amountMinor: 50_00 }));
    const november = await statementOf(user, "2026-11");

    // Act
    const moved = await ok(
      await call(user.cookie, "PATCH", `/statements/${november.id}`, {
        closingDate: "2026-11-25",
        dueDate: "2026-12-03",
      }),
    );

    // Assert
    expect(moved).toMatchObject({ closingDate: "2026-11-25", dueDate: "2026-12-03" });
    expect(totalsOf(moved).totalMinor).toBe(50_00);
    const list = await statements(user);
    expect(list.map((item) => [item.periodMonth, totalsOf(item).totalMinor])).toEqual([
      ["2026-11", 50_00],
      ["2026-12", 150_00],
      ["2027-01", 250_00],
    ]);
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));
    expect(summary.totals[0]).toMatchObject({ currency: "ARS", outMinor: 50_00 });
  });

  it("brings the purchases back when the closing date moves later again", async () => {
    // Arrange
    const user = await newUser();
    await record(
      user,
      purchase(user, { occurredOn: "2026-11-26", amountMinor: 200_00, installments: 2 }),
    );
    const november = await statementOf(user, "2026-11");
    await call(user.cookie, "PATCH", `/statements/${november.id}`, {
      closingDate: "2026-11-25",
      dueDate: "2026-12-03",
    });

    // Act
    const restored = await ok(
      await call(user.cookie, "PATCH", `/statements/${november.id}`, {
        closingDate: "2026-11-30",
        dueDate: "2026-12-10",
      }),
    );

    // Assert
    expect(totalsOf(restored).totalMinor).toBe(100_00);
    const december = await statementOf(user, "2026-12");
    expect(totalsOf(december)).toMatchObject({ previousBalanceMinor: 100_00, totalMinor: 200_00 });
  });

  it("reassigns the purchases of a statement that already had a corrected neighbour", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { occurredOn: "2026-12-20", amountMinor: 90_00 }));
    const december = await statementOf(user, "2026-12");

    // Act
    const moved = await ok(
      await call(user.cookie, "PATCH", `/statements/${december.id}`, {
        closingDate: "2026-12-15",
        dueDate: "2026-12-28",
      }),
    );

    // Assert
    expect(totalsOf(moved).totalMinor).toBe(0);
    const january = await statementOf(user, "2027-01");
    expect(totalsOf(january).totalMinor).toBe(90_00);
  });

  it.each([
    [
      "a closing date outside the month",
      { closingDate: "2026-12-01", dueDate: "2026-12-10" },
      "closing_outside_period",
    ],
    [
      "a due date that is not after the closing date",
      { closingDate: "2026-11-20", dueDate: "2026-11-20" },
      "due_before_closing",
    ],
  ])("rejects %s", async (_label, body, reason) => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;

    // Act
    const response = await call(user.cookie, "PATCH", `/statements/${november.id}`, body);

    // Assert
    expect(await ok(response, 400)).toEqual({ error: "invalid_request", reason });
  });
});

describe("charges", () => {
  it("adds, edits and deletes a charge that counts as an expense in the statement month", async () => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;

    // Act
    const added = await ok(
      await call(
        user.cookie,
        "POST",
        `/statements/${november.id}/charges`,
        charge(user, { description: "Late interest" }),
      ),
      201,
    );
    const movementId = added.charges[0].movementId as string;
    const edited = await ok(
      await call(
        user.cookie,
        "PUT",
        `/statements/${november.id}/charges/${movementId}`,
        charge(user, { amountMinor: 10_00 }),
      ),
    );
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));
    const removed = await ok(
      await call(user.cookie, "DELETE", `/statements/${november.id}/charges/${movementId}`),
    );

    // Assert
    expect(added.charges[0]).toMatchObject({ amountMinor: 36_600_00, occurredOn: "2026-11-27" });
    expect(totalsOf(added).totalMinor).toBe(36_600_00);
    expect(edited.charges).toHaveLength(1);
    expect(totalsOf(edited).chargesMinor).toBe(10_00);
    expect(summary.totals[0]).toMatchObject({ currency: "ARS", outMinor: 10_00 });
    expect(removed.charges).toEqual([]);
    expect(totalsOf(removed).totalMinor).toBe(0);
    expect(await balanceOf(user, user.visa, "ARS")).toBe(0);
  });

  it("keeps a charge in its statement even when the card closing date moves", async () => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;
    await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/charges`, charge(user)),
      201,
    );

    // Act
    const moved = await ok(
      await call(user.cookie, "PATCH", `/statements/${november.id}`, {
        closingDate: "2026-11-05",
        dueDate: "2026-11-20",
      }),
    );

    // Assert
    expect(moved.charges).toHaveLength(1);
    expect(totalsOf(moved).chargesMinor).toBe(36_600_00);
  });

  it("rejects a category outside Financial charges and an unknown category", async () => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;

    // Act
    const wrongGroup = await call(
      user.cookie,
      "POST",
      `/statements/${november.id}/charges`,
      charge(user, { categoryId: user.food }),
    );
    const unknown = await call(
      user.cookie,
      "POST",
      `/statements/${november.id}/charges`,
      charge(user, { categoryId: ID }),
    );

    // Assert
    expect(await ok(wrongGroup, 400)).toEqual({
      error: "invalid_request",
      reason: "category_not_allowed",
    });
    expect(await ok(unknown, 400)).toEqual({
      error: "invalid_request",
      reason: "category_not_found",
    });
  });

  it("answers 404 for a movement that is not a charge of that statement", async () => {
    // Arrange
    const user = await newUser();
    const bought = await record(user, purchase(user));
    const november = (await statements(user))[0] as Json;

    // Act
    const edit = await call(
      user.cookie,
      "PUT",
      `/statements/${november.id}/charges/${bought.id}`,
      charge(user),
    );
    const remove = await call(
      user.cookie,
      "DELETE",
      `/statements/${november.id}/charges/${bought.id}`,
    );

    // Assert
    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
  });

  it("keeps the date of a charge when only its amount changes", async () => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;
    const added = await ok(
      await call(
        user.cookie,
        "POST",
        `/statements/${november.id}/charges`,
        charge(user, { occurredOn: "2026-11-20" }),
      ),
      201,
    );

    // Act
    const edited = await ok(
      await call(
        user.cookie,
        "PUT",
        `/statements/${november.id}/charges/${added.charges[0].movementId}`,
        { categoryId: user.interest, currency: "ARS", amountMinor: 5_00 },
      ),
    );

    // Assert
    expect(edited.charges[0]).toMatchObject({ occurredOn: "2026-11-20", amountMinor: 5_00 });
  });

  it("refuses to edit a charge or a payment through the movements endpoint", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user));
    const november = await statementOf(user, "2026-11");
    const added = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/charges`, charge(user)),
      201,
    );

    // Act
    const response = await call(
      user.cookie,
      "PUT",
      `/movements/${added.charges[0].movementId}`,
      purchase(user),
    );

    // Assert
    expect(await ok(response, 409)).toEqual({ error: "statement_movement" });
  });

  it("tells the movements endpoint which statement a payment belongs to and hides it from others", async () => {
    // Arrange
    const user = await newUser();
    const stranger = await newUser();
    await record(user, purchase(user, { amountMinor: 200_00 }));
    const november = await statementOf(user, "2026-11");
    await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/payments`, {
        fromAccountId: user.bank,
        occurredOn: "2026-12-05",
        arsMinor: 40_00,
      }),
      201,
    );
    const movementId = (await ok(await call(user.cookie, "GET", "/movements?type=transfer")))
      .items[0].id;

    // Act
    const own = await ok(await call(user.cookie, "GET", `/movements/${movementId}`));
    const foreign = await call(stranger.cookie, "GET", `/movements/${movementId}`);

    // Assert
    expect(own.statement).toMatchObject({ id: november.id, periodMonth: "2026-11" });
    expect(foreign.status).toBe(404);
  });

  it("tells the movements endpoint which statement a charge belongs to", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user));
    const november = await statementOf(user, "2026-11");
    const added = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/charges`, charge(user)),
      201,
    );
    const movementId = added.charges[0].movementId;

    // Act
    const found = await ok(await call(user.cookie, "GET", `/movements/${movementId}`));

    // Assert
    expect(found.statement).toEqual({
      id: november.id,
      accountId: november.accountId,
      periodMonth: "2026-11",
    });
  });
});

describe("the bank total and the adjustment", () => {
  async function figures(user: User, statementId: string, body: Json) {
    return ok(await call(user.cookie, "PUT", `/statements/${statementId}/bank-figures`, body));
  }

  it("stores the bank total and the minimum and reports the difference", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    const november = await statementOf(user, "2026-11");

    // Act
    const updated = await figures(user, november.id, {
      bankTotalArsMinor: 130_00,
      minimumArsMinor: 20_00,
    });

    // Assert
    expect(totalsOf(updated)).toMatchObject({
      bankTotalMinor: 130_00,
      minimumMinor: 20_00,
      differenceMinor: 30_00,
    });
    expect(totalsOf(updated, "USD")).toMatchObject({ bankTotalMinor: null, differenceMinor: null });
  });

  it("clears the figures that are left out", async () => {
    // Arrange
    const user = await newUser();
    const november = (await statements(user))[0] as Json;
    await figures(user, november.id as string, { bankTotalArsMinor: 130_00 });

    // Act
    const cleared = await figures(user, november.id as string, {});

    // Assert
    expect(totalsOf(cleared)).toMatchObject({ bankTotalMinor: null, differenceMinor: null });
  });

  it("records the difference as a single Adjustment charge and keeps it single", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    const november = await statementOf(user, "2026-11");
    await figures(user, november.id, { bankTotalArsMinor: 130_00 });

    // Act
    const adjusted = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/adjustment`, { currency: "ARS" }),
    );
    await figures(user, november.id, { bankTotalArsMinor: 150_00 });
    const readjusted = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/adjustment`, { currency: "ARS" }),
    );

    // Assert
    expect(adjusted.charges).toEqual([
      expect.objectContaining({
        categoryId: user.adjustment,
        amountMinor: 30_00,
        isAdjustment: true,
      }),
    ]);
    expect(totalsOf(adjusted)).toMatchObject({ totalMinor: 130_00, differenceMinor: 0 });
    expect(readjusted.charges).toHaveLength(1);
    expect(readjusted.charges[0]).toMatchObject({ amountMinor: 50_00, isAdjustment: true });
    expect(totalsOf(readjusted)).toMatchObject({ totalMinor: 150_00, differenceMinor: 0 });
  });

  it("collapses several Adjustment charges into one in a single step", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    const november = await statementOf(user, "2026-11");
    for (const amountMinor of [10_00, 20_00]) {
      await ok(
        await call(
          user.cookie,
          "POST",
          `/statements/${november.id}/charges`,
          charge(user, { categoryId: user.adjustment, amountMinor }),
        ),
        201,
      );
    }
    await figures(user, november.id, { bankTotalArsMinor: 160_00 });

    // Act
    const adjusted = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/adjustment`, { currency: "ARS" }),
    );

    // Assert
    expect(adjusted.charges).toHaveLength(1);
    expect(adjusted.charges[0]).toMatchObject({ amountMinor: 60_00, isAdjustment: true });
    expect(totalsOf(adjusted)).toMatchObject({ totalMinor: 160_00, differenceMinor: 0 });
  });

  it("creates a single Adjustment charge even when requested twice at once", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    const november = await statementOf(user, "2026-11");
    await figures(user, november.id, { bankTotalArsMinor: 130_00 });
    const adjust = () =>
      call(user.cookie, "POST", `/statements/${november.id}/adjustment`, { currency: "ARS" });

    // Act
    const responses = await Promise.all([adjust(), adjust()]);

    // Assert
    expect(responses.map((response) => response.status)).toEqual([200, 200]);
    const detail = await statementOf(user, "2026-11");
    expect(detail.charges).toHaveLength(1);
    expect(totalsOf(detail)).toMatchObject({ totalMinor: 130_00, differenceMinor: 0 });
  });

  it("removes a stale Adjustment charge when the bank total drops to the calculation", async () => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    const november = await statementOf(user, "2026-11");
    await figures(user, november.id, { bankTotalArsMinor: 130_00 });
    await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/adjustment`, { currency: "ARS" }),
    );
    await figures(user, november.id, { bankTotalArsMinor: 100_00 });

    // Act
    const settled = await ok(
      await call(user.cookie, "POST", `/statements/${november.id}/adjustment`, { currency: "ARS" }),
    );

    // Assert
    expect(settled.charges).toEqual([]);
    expect(totalsOf(settled)).toMatchObject({ totalMinor: 100_00, differenceMinor: 0 });
  });

  it.each([
    ["no bank total", {}, "bank_total_missing"],
    [
      "a bank total equal to the calculation",
      { bankTotalArsMinor: 100_00 },
      "no_positive_difference",
    ],
    ["a bank total below the calculation", { bankTotalArsMinor: 90_00 }, "no_positive_difference"],
  ])("refuses an adjustment with %s", async (_label, bank, reason) => {
    // Arrange
    const user = await newUser();
    await record(user, purchase(user, { amountMinor: 100_00 }));
    const november = await statementOf(user, "2026-11");
    await figures(user, november.id, bank);

    // Act
    const response = await call(user.cookie, "POST", `/statements/${november.id}/adjustment`, {
      currency: "ARS",
    });

    // Assert
    expect(await ok(response, 400)).toEqual({ error: "invalid_request", reason });
  });

  it("rejects bank figures for a currency the card does not hold", async () => {
    // Arrange
    const user = await newUser();
    const pesosCard = await ok(
      await call(user.cookie, "POST", "/accounts", {
        type: "credit_card",
        name: "Pesos card",
        closingDay: 10,
        dueDay: 20,
        currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
      }),
      201,
    );
    const open = (await statements(user, pesosCard.id))[0] as Json;

    // Act
    const response = await call(user.cookie, "PUT", `/statements/${open.id}/bank-figures`, {
      bankTotalUsdMinor: 10_00,
    });

    // Assert
    expect(await ok(response, 400)).toEqual({
      error: "invalid_request",
      reason: "currency_not_in_account",
    });
  });
});

describe("data isolation", () => {
  async function setup() {
    const owner = await newUser();
    const stranger = await newUser();
    await record(owner, purchase(owner, { amountMinor: 100_00 }));
    const november = await statementOf(owner, "2026-11");
    const added = await ok(
      await call(owner.cookie, "POST", `/statements/${november.id}/charges`, charge(owner)),
      201,
    );
    const mine = (await statements(stranger))[0] as Json;
    return { owner, stranger, november, chargeId: added.charges[0].movementId as string, mine };
  }

  it("hides the statements of another user on every endpoint", async () => {
    // Arrange
    const { owner, stranger, november, chargeId } = await setup();
    const requests: [string, string, Json?][] = [
      ["GET", `/statements/${november.id}`],
      ["PATCH", `/statements/${november.id}`, { closingDate: "2026-11-20", dueDate: "2026-11-28" }],
      ["PUT", `/statements/${november.id}/bank-figures`, { bankTotalArsMinor: 1 }],
      ["POST", `/statements/${november.id}/charges`, charge(stranger)],
      ["PUT", `/statements/${november.id}/charges/${chargeId}`, charge(stranger)],
      ["DELETE", `/statements/${november.id}/charges/${chargeId}`],
      [
        "POST",
        `/statements/${november.id}/payments`,
        { fromAccountId: stranger.bank, occurredOn: "2026-12-05", arsMinor: 10_00 },
      ],
      ["POST", `/statements/${november.id}/adjustment`, { currency: "ARS" }],
    ];

    // Act
    const statuses = await Promise.all(
      requests.map(
        async ([method, path, body]) => (await call(stranger.cookie, method, path, body)).status,
      ),
    );

    // Assert
    expect(statuses).toEqual(requests.map(() => 404));
    const intact = await statementOf(owner, "2026-11");
    expect(intact).toMatchObject({ closingDate: "2026-11-27" });
    expect(totalsOf(intact)).toMatchObject({
      chargesMinor: 36_600_00,
      paymentsMinor: 0,
      bankTotalMinor: null,
    });
  });

  it("does not let a statement of the user use a charge of another user", async () => {
    // Arrange
    const { owner, stranger, chargeId, mine } = await setup();

    // Act
    const edit = await call(
      stranger.cookie,
      "PUT",
      `/statements/${mine.id}/charges/${chargeId}`,
      charge(stranger),
    );
    const remove = await call(
      stranger.cookie,
      "DELETE",
      `/statements/${mine.id}/charges/${chargeId}`,
    );

    // Assert
    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
    expect((await statementOf(owner, "2026-11")).charges).toHaveLength(1);
  });

  it("does not accept accounts or categories of another user in a request", async () => {
    // Arrange
    const { owner, stranger, mine } = await setup();

    // Act
    const foreignSource = await call(stranger.cookie, "POST", `/statements/${mine.id}/payments`, {
      fromAccountId: owner.bank,
      occurredOn: "2026-12-05",
      arsMinor: 10_00,
    });
    const foreignCategory = await call(
      stranger.cookie,
      "POST",
      `/statements/${mine.id}/charges`,
      charge(stranger, { categoryId: owner.interest }),
    );

    // Assert
    expect(await ok(foreignSource, 400)).toEqual({
      error: "invalid_request",
      reason: "account_not_found",
    });
    expect(await ok(foreignCategory, 400)).toEqual({
      error: "invalid_request",
      reason: "category_not_found",
    });
    expect(await balanceOf(owner, owner.bank, "ARS")).toBe(0);
  });

  it("never mixes the movements of two users in one statement", async () => {
    // Arrange
    const { owner, stranger } = await setup();
    await record(stranger, purchase(stranger, { amountMinor: 7_00 }));

    // Act
    const theirs = await statementOf(stranger, "2026-11");
    const mine = await statementOf(owner, "2026-11");

    // Assert
    expect(totalsOf(theirs).totalMinor).toBe(7_00);
    expect(totalsOf(mine).totalMinor).toBe(36_700_00);
  });
});
