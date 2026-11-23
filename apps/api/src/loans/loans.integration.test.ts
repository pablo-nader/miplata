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
  const userId = await harness.signUpWithGoogle(`loans-${counter}@example.com`);
  const cookie = await harness.cookieFor(userId);
  const account = async (body: Json) =>
    (await ok(await call(cookie, "POST", "/accounts", body), 201)).id as string;
  const person = async (name: string) =>
    (await ok(await call(cookie, "POST", "/people", { name, currencies: both }), 201)).id as string;
  const catalog = (await ok(await call(cookie, "GET", "/categories"))) as CategoriesResponse;
  return {
    cookie,
    cash: await account({ type: "cash", name: "Cash", currencies: both }),
    visa: await account({
      type: "credit_card",
      name: "Visa",
      closingDay: 20,
      dueDay: 5,
      currencies: both,
    }),
    juan: await person("Juan"),
    ana: await person("Ana"),
    food: catalog.expenseGroups[0]?.categories[0]?.id as string,
    otherIncome: catalog.income.find((item) => item.nameKey === "defaults.income.other")
      ?.id as string,
  };
}

type User = Awaited<ReturnType<typeof newUser>>;

function transfer(from: Json, to: Json, amountMinor: number, currency = "ARS") {
  return {
    type: "transfer",
    occurredOn: "2026-11-10",
    from: { accountId: from, currency, amountMinor },
    to: { accountId: to, currency, amountMinor },
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

async function loans(user: User) {
  return ok(await call(user.cookie, "GET", "/loans"));
}

const someId = "00000000-0000-4000-8000-000000000001";

const endpoints = [
  ["GET", "/loans"],
  ["GET", `/loans/${someId}`],
  ["POST", `/loans/${someId}/forgive`],
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

describe("loans summary", () => {
  it("lists who owes the user and whom the user owes, per currency", async () => {
    // Arrange
    const user = await newUser();
    await record(user, transfer(user.cash, user.juan, 10_000_00));
    await record(user, transfer(user.cash, user.juan, 50_00, "USD"));
    await record(user, transfer(user.ana, user.cash, 3_000_00));

    // Act
    const summary = await loans(user);

    // Assert
    expect(summary.owesYou).toHaveLength(1);
    expect(summary.owesYou[0].name).toBe("Juan");
    expect(summary.owesYou[0].lines.map((line: Json) => [line.currency, line.amountMinor])).toEqual(
      [
        ["ARS", 10_000_00],
        ["USD", 50_00],
      ],
    );
    expect(summary.youOwe).toHaveLength(1);
    expect(summary.youOwe[0].name).toBe("Ana");
    expect(summary.youOwe[0].lines[0]).toMatchObject({ currency: "ARS", amountMinor: 3_000_00 });
    expect(summary.owedToYouTotals).toEqual([
      { currency: "ARS", amountMinor: 10_000_00 },
      { currency: "USD", amountMinor: 50_00 },
    ]);
    expect(summary.youOweTotals).toEqual([{ currency: "ARS", amountMinor: 3_000_00 }]);
  });

  it("leaves out people whose balance is settled", async () => {
    // Arrange
    const user = await newUser();
    await record(user, transfer(user.cash, user.juan, 500_00));
    await record(user, transfer(user.juan, user.cash, 500_00));

    // Act
    const summary = await loans(user);

    // Assert
    expect(summary.owesYou).toEqual([]);
    expect(summary.youOwe).toEqual([]);
  });

  it("reports the installments of purchases made for a person", async () => {
    // Arrange
    const user = await newUser();
    await record(user, {
      type: "expense",
      occurredOn: "2026-11-10",
      categoryId: user.food,
      accountId: user.visa,
      currency: "ARS",
      amountMinor: 90_000_00,
      installments: 3,
      person: { personId: user.juan, ownAmountMinor: 0 },
    });

    // Act
    const summary = await loans(user);

    // Assert
    expect(summary.owesYou[0].lines[0]).toEqual({
      currency: "ARS",
      amountMinor: 90_000_00,
      dueNowMinor: 30_000_00,
      pendingTotalMinor: 90_000_00,
    });
  });

  it("counts only the other person's part of a shared purchase", async () => {
    // Arrange
    const user = await newUser();
    await record(user, {
      type: "expense",
      occurredOn: "2026-11-10",
      categoryId: user.food,
      accountId: user.visa,
      currency: "ARS",
      amountMinor: 60_000_00,
      installments: 2,
      person: { personId: user.ana, ownAmountMinor: 20_000_00 },
    });

    // Act
    const summary = await loans(user);

    // Assert
    expect(summary.owesYou[0].lines[0]).toMatchObject({
      amountMinor: 40_000_00,
      dueNowMinor: 20_000_00,
      pendingTotalMinor: 40_000_00,
    });
  });

  it("does not show another user's people", async () => {
    // Arrange
    const owner = await newUser();
    const stranger = await newUser();
    await record(owner, transfer(owner.cash, owner.juan, 700_00));

    // Act
    const summary = await loans(stranger);

    // Assert
    expect(summary.owesYou).toEqual([]);
    expect(summary.owedToYouTotals).toEqual([]);
  });
});

describe("loan detail", () => {
  it("returns the person's balances and movements", async () => {
    // Arrange
    const user = await newUser();
    const lent = await record(user, transfer(user.cash, user.juan, 700_00));
    await record(user, transfer(user.cash, user.ana, 100_00));

    // Act
    const detail = await ok(await call(user.cookie, "GET", `/loans/${user.juan}`));

    // Assert
    expect(detail.name).toBe("Juan");
    expect(detail.owesYou[0]).toMatchObject({ currency: "ARS", amountMinor: 700_00 });
    expect(detail.youOwe).toEqual([]);
    expect(detail.movements.map((item: Json) => item.id)).toEqual([lent.id]);
  });

  it("answers 404 for another user's person", async () => {
    // Arrange
    const owner = await newUser();
    const stranger = await newUser();

    // Act
    const response = await call(stranger.cookie, "GET", `/loans/${owner.juan}`);

    // Assert
    expect(response.status).toBe(404);
  });

  it("answers 404 for an account that is not a person", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const response = await call(user.cookie, "GET", `/loans/${user.cash}`);

    // Assert
    expect(response.status).toBe(404);
  });
});

describe("forgiving a debt", () => {
  it("turns what a person owes the user into an expense and settles the balance", async () => {
    // Arrange
    const user = await newUser();
    await record(user, transfer(user.cash, user.juan, 700_00));
    await record(user, transfer(user.cash, user.juan, 50_00, "USD"));

    // Act
    const forgiven = await ok(
      await call(user.cookie, "POST", `/loans/${user.juan}/forgive`, {
        currency: "ARS",
        categoryId: user.food,
        occurredOn: "2026-11-12",
      }),
      201,
    );
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(forgiven.type).toBe("expense");
    expect(forgiven.categoryId).toBe(user.food);
    expect(await balanceOf(user, user.juan, "ARS", "/people")).toBe(0);
    expect(await balanceOf(user, user.juan, "USD", "/people")).toBe(50_00);
    expect(summary.totals[0]).toEqual({ currency: "ARS", inMinor: 0, outMinor: 700_00 });
  });

  it("turns what the user owes a person into income and settles the balance", async () => {
    // Arrange
    const user = await newUser();
    await record(user, transfer(user.ana, user.cash, 3_000_00));

    // Act
    const forgiven = await ok(
      await call(user.cookie, "POST", `/loans/${user.ana}/forgive`, {
        currency: "ARS",
        categoryId: user.otherIncome,
      }),
      201,
    );
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(forgiven.type).toBe("income");
    expect(await balanceOf(user, user.ana, "ARS", "/people")).toBe(0);
    expect(summary.totals[0]).toEqual({ currency: "ARS", inMinor: 3_000_00, outMinor: 0 });
    expect((await loans(user)).youOwe).toEqual([]);
  });

  it("rejects a category of the wrong type", async () => {
    // Arrange
    const user = await newUser();
    await record(user, transfer(user.cash, user.juan, 700_00));

    // Act
    const body = await ok(
      await call(user.cookie, "POST", `/loans/${user.juan}/forgive`, {
        currency: "ARS",
        categoryId: user.otherIncome,
      }),
      400,
    );

    // Assert
    expect(body.reason).toBe("category_type_mismatch");
    expect(await balanceOf(user, user.juan, "ARS", "/people")).toBe(700_00);
  });

  it("rejects forgiving a balance that is already settled", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const body = await ok(
      await call(user.cookie, "POST", `/loans/${user.juan}/forgive`, {
        currency: "ARS",
        categoryId: user.food,
      }),
      400,
    );

    // Assert
    expect(body.reason).toBe("nothing_owed");
  });

  it("cannot forgive another user's person", async () => {
    // Arrange
    const owner = await newUser();
    const stranger = await newUser();
    await record(owner, transfer(owner.cash, owner.juan, 700_00));

    // Act
    const response = await call(stranger.cookie, "POST", `/loans/${owner.juan}/forgive`, {
      currency: "ARS",
      categoryId: stranger.food,
    });

    // Assert
    expect(response.status).toBe(404);
    expect(await balanceOf(owner, owner.juan, "ARS", "/people")).toBe(700_00);
  });
});

describe("repaying more than what is owed", () => {
  it("settles the debt and records the excess as income", async () => {
    // Arrange
    const user = await newUser();
    await record(user, transfer(user.cash, user.juan, 700_00));

    // Act
    await record(user, transfer(user.juan, user.cash, 1_000_00));
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(await balanceOf(user, user.juan, "ARS", "/people")).toBe(0);
    expect(await balanceOf(user, user.cash, "ARS")).toBe(300_00);
    expect(summary.totals[0]).toEqual({ currency: "ARS", inMinor: 300_00, outMinor: 0 });
  });

  it("does not create income when the repayment is not above the debt", async () => {
    // Arrange
    const user = await newUser();
    await record(user, transfer(user.cash, user.juan, 700_00));

    // Act
    await record(user, transfer(user.juan, user.cash, 700_00));
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(await balanceOf(user, user.juan, "ARS", "/people")).toBe(0);
    expect(summary.totals[0]).toEqual({ currency: "ARS", inMinor: 0, outMinor: 0 });
  });

  it("treats a transfer from a person nobody owes as borrowing, not income", async () => {
    // Arrange
    const user = await newUser();

    // Act
    await record(user, transfer(user.ana, user.cash, 400_00));
    const summary = await ok(await call(user.cookie, "GET", "/movements/summary?month=2026-11"));

    // Assert
    expect(await balanceOf(user, user.ana, "ARS", "/people")).toBe(-400_00);
    expect(summary.totals[0]).toEqual({ currency: "ARS", inMinor: 0, outMinor: 0 });
  });
});
