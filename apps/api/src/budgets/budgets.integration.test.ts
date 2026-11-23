import type { BudgetProgressDto, CategoriesResponse } from "@miplata/shared";
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
  const userId = await harness.signUpWithGoogle(`budgets-${counter}@example.com`);
  const cookie = await harness.cookieFor(userId);
  const account = async (body: Json) =>
    (await ok(await call(cookie, "POST", "/accounts", body), 201)).id as string;
  const catalog = (await ok(await call(cookie, "GET", "/categories"))) as CategoriesResponse;
  const group = catalog.expenseGroups[0];
  const otherGroup = catalog.expenseGroups[1];
  return {
    cookie,
    cash: await account({ type: "cash", name: "Cash", currencies: both }),
    bank: await account({ type: "bank", name: "Bank", currencies: both }),
    visa: await account({
      type: "credit_card",
      name: "Visa",
      closingDay: 20,
      dueDay: 5,
      currencies: both,
    }),
    juan: (await ok(await call(cookie, "POST", "/people", { name: "Juan", currencies: both }), 201))
      .id as string,
    food: group?.categories[0]?.id as string,
    otherFood: group?.categories[1]?.id as string,
    groupId: group?.id as string,
    elsewhere: otherGroup?.categories[0]?.id as string,
    salary: catalog.income[0]?.id as string,
  };
}

type User = Awaited<ReturnType<typeof newUser>>;

function expense(user: User, changes: Record<string, unknown> = {}) {
  return {
    type: "expense",
    occurredOn: "2026-11-10",
    categoryId: user.food,
    accountId: user.cash,
    currency: "ARS",
    amountMinor: 1000,
    ...changes,
  };
}

async function spend(user: User, changes: Record<string, unknown> = {}) {
  return ok(await call(user.cookie, "POST", "/movements", expense(user, changes)), 201);
}

async function budget(user: User, target: Record<string, unknown>, limitMinor = 10000) {
  return ok(
    await call(user.cookie, "POST", "/budgets", { currency: "ARS", limitMinor, ...target }),
    201,
  );
}

async function progress(user: User, month = "2026-11", attention = false) {
  const body = await ok(
    await call(user.cookie, "GET", `/budgets?month=${month}${attention ? "&attention=true" : ""}`),
  );
  return body.items as BudgetProgressDto[];
}

describe("budgets endpoints", () => {
  it("creates, lists, edits and deletes a budget and rejects bad input", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const created = await budget(user, { categoryId: user.food });
    const duplicate = await call(user.cookie, "POST", "/budgets", {
      categoryId: user.food,
      currency: "ARS",
      limitMinor: 5,
    });
    const income = await call(user.cookie, "POST", "/budgets", {
      categoryId: user.salary,
      currency: "ARS",
      limitMinor: 5,
    });
    const both = await call(user.cookie, "POST", "/budgets", {
      categoryId: user.food,
      groupId: user.groupId,
      currency: "ARS",
      limitMinor: 5,
    });
    const edited = await ok(
      await call(user.cookie, "PUT", `/budgets/${created.id}`, {
        groupId: user.groupId,
        currency: "USD",
        limitMinor: 777,
      }),
    );
    const removed = await call(user.cookie, "DELETE", `/budgets/${created.id}`);
    const after = await progress(user);

    // Assert
    expect(created).toMatchObject({ categoryId: user.food, groupId: null, limitMinor: 10000 });
    expect(duplicate.status).toBe(409);
    expect(income.status).toBe(400);
    expect(both.status).toBe(400);
    expect(edited).toMatchObject({ categoryId: null, groupId: user.groupId, currency: "USD" });
    expect(removed.status).toBe(204);
    expect(after).toEqual([]);
  });

  it("requires a session", async () => {
    // Arrange
    const id = "00000000-0000-4000-8000-000000000001";

    // Act
    const responses = await Promise.all([
      call(undefined, "GET", "/budgets?month=2026-11"),
      call(undefined, "POST", "/budgets", {}),
      call(undefined, "PUT", `/budgets/${id}`, {}),
      call(undefined, "DELETE", `/budgets/${id}`),
    ]);

    // Assert
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401]);
  });

  it("isolates the data of each user on every endpoint", async () => {
    // Arrange
    const alice = await newUser();
    const bob = await newUser();
    const aliceBudget = await budget(alice, { categoryId: alice.food });
    await spend(alice, { amountMinor: 9000 });

    // Act
    const listed = await progress(bob);
    const create = await call(bob.cookie, "POST", "/budgets", {
      categoryId: alice.food,
      currency: "ARS",
      limitMinor: 100,
    });
    const createGroup = await call(bob.cookie, "POST", "/budgets", {
      groupId: alice.groupId,
      currency: "ARS",
      limitMinor: 100,
    });
    const edit = await call(bob.cookie, "PUT", `/budgets/${aliceBudget.id}`, {
      categoryId: bob.food,
      currency: "ARS",
      limitMinor: 1,
    });
    const remove = await call(bob.cookie, "DELETE", `/budgets/${aliceBudget.id}`);
    const stillThere = await progress(alice);

    // Assert
    expect(listed).toEqual([]);
    expect(create.status).toBe(400);
    expect(createGroup.status).toBe(400);
    expect(edit.status).toBe(404);
    expect(remove.status).toBe(404);
    expect(stillThere).toHaveLength(1);
    expect(stillThere[0]).toMatchObject({ limitMinor: 10000, spentMinor: 9000 });
  });
});

describe("budget progress", () => {
  it("moves through below, warning and reached at 80% and 100%", async () => {
    // Arrange
    const user = await newUser();
    await budget(user, { categoryId: user.food }, 10000);

    // Act
    await spend(user, { amountMinor: 7999 });
    const below = (await progress(user))[0];
    await spend(user, { amountMinor: 1 });
    const warning = (await progress(user))[0];
    await spend(user, { amountMinor: 1999 });
    const almost = (await progress(user))[0];
    await spend(user, { amountMinor: 1 });
    const reached = (await progress(user))[0];
    await spend(user, { amountMinor: 500 });
    const over = (await progress(user))[0];

    // Assert
    expect(below).toMatchObject({ spentMinor: 7999, remainingMinor: 2001, state: "below" });
    expect(warning).toMatchObject({ spentMinor: 8000, state: "warning" });
    expect(almost).toMatchObject({ spentMinor: 9999, remainingMinor: 1, state: "warning" });
    expect(reached).toMatchObject({ spentMinor: 10000, remainingMinor: 0, state: "reached" });
    expect(over).toMatchObject({ spentMinor: 10500, remainingMinor: 0, overspentMinor: 500 });
  });

  it("counts card installments in their statement month", async () => {
    // Arrange
    const user = await newUser();
    const created = await spend(user, {
      occurredOn: "2026-11-25",
      accountId: user.visa,
      amountMinor: 30000,
      installments: 3,
    });
    const months = (created.installments as { periodMonth: string }[]).map(
      (item) => item.periodMonth,
    );
    await budget(user, { categoryId: user.food }, 100000);

    // Act
    const spentIn = async (month: string) => (await progress(user, month))[0]?.spentMinor;
    const perMonth = await Promise.all(months.map(spentIn));
    const purchaseMonth = await spentIn("2026-11");

    // Assert
    expect(months).toHaveLength(3);
    expect(perMonth).toEqual([10000, 10000, 10000]);
    expect(months).not.toContain("2026-11");
    expect(purchaseMonth).toBe(0);
  });

  it("counts only the user's share of a shared purchase and nothing for a purchase for another", async () => {
    // Arrange
    const user = await newUser();
    await budget(user, { categoryId: user.food }, 100000);

    // Act
    await spend(user, {
      amountMinor: 10000,
      person: { personId: user.juan, ownAmountMinor: 4000 },
    });
    const shared = (await progress(user))[0];
    await spend(user, { amountMinor: 5000, person: { personId: user.juan, ownAmountMinor: 0 } });
    const forOther = (await progress(user))[0];

    // Assert
    expect(shared?.spentMinor).toBe(4000);
    expect(forOther?.spentMinor).toBe(4000);
  });

  it("includes every category of a group in the group budget and keeps category budgets apart", async () => {
    // Arrange
    const user = await newUser();
    await budget(user, { groupId: user.groupId }, 10000);
    await budget(user, { categoryId: user.food }, 5000);

    // Act
    await spend(user, { categoryId: user.food, amountMinor: 3000 });
    await spend(user, { categoryId: user.otherFood, amountMinor: 2000 });
    await spend(user, { categoryId: user.elsewhere, amountMinor: 9000 });
    const items = await progress(user);

    // Assert
    expect(items.find((item) => item.groupId)).toMatchObject({ spentMinor: 5000 });
    expect(items.find((item) => item.categoryId)).toMatchObject({ spentMinor: 3000 });
  });

  it("ignores income, transfers, exchanges, loans and other currencies", async () => {
    // Arrange
    const user = await newUser();
    await budget(user, { categoryId: user.food }, 10000);
    const leg = (accountId: string, currency: string, amountMinor: number) => ({
      accountId,
      currency,
      amountMinor,
    });

    // Act
    await ok(
      await call(user.cookie, "POST", "/movements", {
        type: "income",
        occurredOn: "2026-11-10",
        categoryId: user.salary,
        accountId: user.cash,
        currency: "ARS",
        amountMinor: 50000,
      }),
      201,
    );
    await ok(
      await call(user.cookie, "POST", "/movements", {
        type: "transfer",
        occurredOn: "2026-11-10",
        from: leg(user.cash, "ARS", 4000),
        to: leg(user.bank, "ARS", 4000),
      }),
      201,
    );
    await ok(
      await call(user.cookie, "POST", "/movements", {
        type: "transfer",
        occurredOn: "2026-11-10",
        from: leg(user.cash, "ARS", 120000),
        to: leg(user.bank, "USD", 100),
      }),
      201,
    );
    await ok(
      await call(user.cookie, "POST", "/movements", {
        type: "transfer",
        occurredOn: "2026-11-10",
        from: leg(user.cash, "ARS", 7000),
        to: leg(user.juan, "ARS", 7000),
      }),
      201,
    );
    await spend(user, { currency: "USD", accountId: user.bank, amountMinor: 5000 });
    const items = await progress(user);

    // Assert
    expect(items[0]).toMatchObject({ spentMinor: 0, state: "below" });
  });

  it("starts every month from zero with no rollover", async () => {
    // Arrange
    const user = await newUser();
    await budget(user, { categoryId: user.food }, 10000);
    await spend(user, { occurredOn: "2026-10-15", amountMinor: 10000 });

    // Act
    const october = (await progress(user, "2026-10"))[0];
    const november = (await progress(user, "2026-11"))[0];

    // Assert
    expect(october).toMatchObject({ state: "reached", spentMinor: 10000 });
    expect(november).toMatchObject({ state: "below", spentMinor: 0, remainingMinor: 10000 });
  });

  it("lists only budgets near or over their limit, reached first", async () => {
    // Arrange
    const user = await newUser();
    await budget(user, { categoryId: user.food }, 10000);
    await budget(user, { categoryId: user.otherFood }, 10000);
    await budget(user, { categoryId: user.elsewhere }, 10000);
    await spend(user, { categoryId: user.food, amountMinor: 8500 });
    await spend(user, { categoryId: user.otherFood, amountMinor: 10000 });
    await spend(user, { categoryId: user.elsewhere, amountMinor: 100 });

    // Act
    const flagged = await progress(user, "2026-11", true);

    // Assert
    expect(flagged.map((item) => item.categoryId)).toEqual([user.otherFood, user.food]);
    expect(flagged.map((item) => item.state)).toEqual(["reached", "warning"]);
  });
});
