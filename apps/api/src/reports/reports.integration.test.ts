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
  const userId = await harness.signUpWithGoogle(`reports-${counter}@example.com`);
  const cookie = await harness.cookieFor(userId);
  const account = async (body: Json) =>
    (await ok(await call(cookie, "POST", "/accounts", body), 201)).id as string;
  const catalog = (await ok(await call(cookie, "GET", "/categories"))) as CategoriesResponse;
  const firstGroup = catalog.expenseGroups[0];
  const secondGroup = catalog.expenseGroups[1];
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
    food: firstGroup?.categories[0]?.id as string,
    otherFood: firstGroup?.categories[1]?.id as string,
    firstGroupId: firstGroup?.id as string,
    secondGroupCategory: secondGroup?.categories[0]?.id as string,
    secondGroupId: secondGroup?.id as string,
    salary: catalog.income[0]?.id as string,
  };
}

type User = Awaited<ReturnType<typeof newUser>>;

async function record(user: User, body: Json) {
  return ok(await call(user.cookie, "POST", "/movements", body), 201);
}

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

async function defineRecurring(user: User, changes: Json = {}) {
  const body = {
    type: "expense",
    frequency: "monthly",
    dayOfMonth: 5,
    amountMode: "fixed",
    amountMinor: 200_00,
    currency: "ARS",
    accountId: user.cash,
    categoryId: user.food,
    description: "Rent",
    startsOn: "2026-10-01",
    ...changes,
  };
  return ok(await call(user.cookie, "POST", "/recurring", body), 201);
}

const get = (user: User, path: string) => call(user.cookie, "GET", `/reports${path}`);

const endpoints = [
  "/spending?month=2026-11",
  "/spending/movements?month=2026-11&categoryId=00000000-0000-4000-8000-000000000001",
  "/monthly?to=2026-11",
  "/changes?month=2026-11",
  "/committed?from=2026-12",
];

describe("authentication", () => {
  it.each(endpoints)("GET %s rejects requests without a session", async (path) => {
    // Arrange
    const noCookie = undefined;

    // Act
    const response = await call(noCookie, "GET", `/reports${path}`);

    // Assert
    expect(response.status).toBe(401);
  });
});

describe("data isolation", () => {
  it("never shows another user's movements in any report", async () => {
    // Arrange
    const owner = await newUser();
    const stranger = await newUser();
    await record(owner, expense(owner, { amountMinor: 700_00 }));
    await record(
      owner,
      expense(owner, { accountId: owner.visa, amountMinor: 900_00, installments: 3 }),
    );

    // Act
    const [spending, movements, monthly, changes, committed] = await Promise.all([
      ok(await get(stranger, "/spending?month=2026-11")),
      ok(await get(stranger, `/spending/movements?month=2026-11&categoryId=${owner.food}`)),
      ok(await get(stranger, "/monthly?to=2026-11")),
      ok(await get(stranger, "/changes?month=2026-11")),
      ok(await get(stranger, "/committed?from=2026-11&months=4")),
    ]);

    // Assert
    expect(spending.groups).toEqual([]);
    expect(movements.items).toEqual([]);
    expect(monthly.months.every((month: Json) => month.outMinor === 0)).toBe(true);
    expect(changes.categories).toEqual([]);
    expect(committed.months.every((month: Json) => month.totalMinor === 0)).toBe(true);
  });

  it("returns nothing when filtering by another user's account", async () => {
    // Arrange
    const owner = await newUser();
    const stranger = await newUser();
    await record(owner, expense(owner));

    // Act
    const report = await ok(await get(stranger, `/spending?month=2026-11&accountId=${owner.cash}`));

    // Assert
    expect(report.totalMinor).toBe(0);
  });
});

describe("validation", () => {
  it.each([
    "/spending",
    "/spending?month=2026-13",
    "/spending/movements?month=2026-11",
    "/monthly?to=nope",
    "/changes?month=2026-11&currency=EUR",
    "/committed?from=2026-12&months=13",
    "/spending?month=2026-11&accountId=not-a-uuid",
  ])("GET %s answers 400", async (path) => {
    // Arrange
    const user = await newUser();

    // Act
    const response = await get(user, path);

    // Assert
    expect(response.status).toBe(400);
  });
});

describe("spending by group", () => {
  it("orders groups and categories largest first with shares and keeps currencies apart", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { amountMinor: 600_00 }));
    await record(user, expense(user, { categoryId: user.otherFood, amountMinor: 200_00 }));
    await record(
      user,
      expense(user, { categoryId: user.secondGroupCategory, amountMinor: 200_00 }),
    );
    await record(user, expense(user, { currency: "USD", amountMinor: 50_00 }));

    // Act
    const report = await ok(await get(user, "/spending?month=2026-11"));
    const dollars = await ok(await get(user, "/spending?month=2026-11&currency=USD"));

    // Assert
    expect(report.totalMinor).toBe(1_000_00);
    expect(report.groups.map((group: Json) => [group.groupId, group.totalMinor])).toEqual([
      [user.firstGroupId, 800_00],
      [user.secondGroupId, 200_00],
    ]);
    expect(report.groups[0].sharePercent).toBe(80);
    expect(report.groups[0].categories.map((category: Json) => category.categoryId)).toEqual([
      user.food,
      user.otherFood,
    ]);
    expect(dollars.totalMinor).toBe(50_00);
  });

  it("counts card installments in their statement month", async () => {
    // Arrange
    const user = await newUser();
    await record(
      user,
      expense(user, {
        accountId: user.visa,
        occurredOn: "2026-11-25",
        amountMinor: 900_00,
        installments: 3,
      }),
    );

    // Act
    const november = await ok(await get(user, "/spending?month=2026-11"));
    const december = await ok(await get(user, "/spending?month=2026-12"));
    const february = await ok(await get(user, "/spending?month=2027-02"));

    // Assert
    expect([november.totalMinor, december.totalMinor, february.totalMinor]).toEqual([
      0, 300_00, 300_00,
    ]);
  });

  it("counts only the user's share of a shared purchase and ignores transfers and income", async () => {
    // Arrange
    const user = await newUser();
    await record(
      user,
      expense(user, {
        accountId: user.visa,
        amountMinor: 1_600_00,
        installments: 2,
        occurredOn: "2026-11-10",
        person: { personId: user.juan, ownAmountMinor: 800_00 },
      }),
    );
    await record(user, {
      type: "transfer",
      occurredOn: "2026-11-10",
      from: { accountId: user.cash, currency: "ARS", amountMinor: 500_00 },
      to: { accountId: user.bank, currency: "ARS", amountMinor: 500_00 },
    });
    await record(user, {
      type: "income",
      occurredOn: "2026-11-01",
      categoryId: user.salary,
      accountId: user.bank,
      currency: "ARS",
      amountMinor: 2_000_00,
    });

    // Act
    const report = await ok(await get(user, "/spending?month=2026-11"));

    // Assert
    expect(report.totalMinor).toBe(400_00);
  });

  it("filters by account and by category", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { amountMinor: 100_00 }));
    await record(user, expense(user, { accountId: user.bank, amountMinor: 300_00 }));
    await record(user, expense(user, { categoryId: user.otherFood, amountMinor: 50_00 }));

    // Act
    const byAccount = await ok(await get(user, `/spending?month=2026-11&accountId=${user.bank}`));
    const byCategory = await ok(
      await get(user, `/spending?month=2026-11&categoryId=${user.otherFood}`),
    );

    // Assert
    expect(byAccount.totalMinor).toBe(300_00);
    expect(byCategory.totalMinor).toBe(50_00);
  });

  it("drills down to the movements of a category in the month", async () => {
    // Arrange
    const user = await newUser();
    const cash = await record(user, expense(user, { description: "Market", amountMinor: 100_00 }));
    await record(
      user,
      expense(user, {
        accountId: user.visa,
        description: "Fridge",
        occurredOn: "2026-11-25",
        amountMinor: 900_00,
        installments: 3,
      }),
    );

    // Act
    const november = await ok(
      await get(user, `/spending/movements?month=2026-11&categoryId=${user.food}`),
    );
    const december = await ok(
      await get(user, `/spending/movements?month=2026-12&categoryId=${user.food}`),
    );

    // Assert
    expect(november.items).toEqual([
      {
        movementId: cash.id,
        occurredOn: "2026-11-10",
        description: "Market",
        categoryId: user.food,
        ownAmountMinor: 100_00,
        installmentNumber: null,
        installmentCount: 1,
      },
    ]);
    expect(december.items).toMatchObject([
      { description: "Fridge", ownAmountMinor: 300_00, installmentNumber: 1, installmentCount: 3 },
    ]);
  });
});

describe("in versus out by month", () => {
  it("returns twelve months with each result", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { amountMinor: 300_00 }));
    await record(user, {
      type: "income",
      occurredOn: "2026-11-01",
      categoryId: user.salary,
      accountId: user.bank,
      currency: "ARS",
      amountMinor: 1_000_00,
    });
    await record(user, expense(user, { occurredOn: "2026-01-10", amountMinor: 50_00 }));
    await record(user, expense(user, { occurredOn: "2025-10-10", amountMinor: 999_00 }));

    // Act
    const report = await ok(await get(user, "/monthly?to=2026-11"));

    // Assert
    expect(report.months).toHaveLength(12);
    expect(report.months[0].month).toBe("2025-12");
    expect(report.months[11]).toEqual({
      month: "2026-11",
      inMinor: 1_000_00,
      outMinor: 300_00,
      resultMinor: 700_00,
    });
    expect(report.months[1]).toMatchObject({
      month: "2026-01",
      outMinor: 50_00,
      resultMinor: -50_00,
    });
  });
});

describe("change against the previous three months", () => {
  it("compares with the average of three months counting missing months as zero", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { occurredOn: "2026-11-10", amountMinor: 200_00 }));
    await record(user, expense(user, { occurredOn: "2026-09-10", amountMinor: 300_00 }));
    await record(
      user,
      expense(user, {
        categoryId: user.otherFood,
        occurredOn: "2026-11-10",
        amountMinor: 80_00,
      }),
    );

    // Act
    const report = await ok(await get(user, "/changes?month=2026-11"));

    // Assert
    expect(report.categories).toEqual([
      {
        categoryId: user.food,
        currentMinor: 200_00,
        previousAverageMinor: 100_00,
        percentChange: 100,
      },
      {
        categoryId: user.otherFood,
        currentMinor: 80_00,
        previousAverageMinor: 0,
        percentChange: null,
      },
    ]);
  });
});

describe("committed amounts", () => {
  it("lists future installments per coming month with the user's share only", async () => {
    // Arrange
    const user = await newUser();
    await record(
      user,
      expense(user, {
        accountId: user.visa,
        occurredOn: "2026-11-25",
        amountMinor: 900_00,
        installments: 3,
      }),
    );
    await record(
      user,
      expense(user, {
        accountId: user.visa,
        occurredOn: "2026-11-25",
        amountMinor: 600_00,
        installments: 3,
        person: { personId: user.juan, ownAmountMinor: 300_00 },
      }),
    );

    // Act
    const report = await ok(await get(user, "/committed?from=2026-12&months=4"));

    // Assert
    expect(report.months).toEqual([
      { month: "2026-12", installmentsMinor: 400_00, recurringMinor: 0, totalMinor: 400_00 },
      { month: "2027-01", installmentsMinor: 400_00, recurringMinor: 0, totalMinor: 400_00 },
      { month: "2027-02", installmentsMinor: 400_00, recurringMinor: 0, totalMinor: 400_00 },
      { month: "2027-03", installmentsMinor: 0, recurringMinor: 0, totalMinor: 0 },
    ]);
  });
});

describe("amounts that never count", () => {
  it("leaves a purchase made entirely for another person out of the drill-down", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { person: { personId: user.juan, ownAmountMinor: 0 } }));

    // Act
    const movements = await ok(
      await get(user, `/spending/movements?month=2026-11&categoryId=${user.food}`),
    );
    const spending = await ok(await get(user, "/spending?month=2026-11"));

    // Assert
    expect(movements.items).toEqual([]);
    expect(spending.totalMinor).toBe(0);
  });

  it("matches nothing when the account filter is a person", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { person: { personId: user.juan, ownAmountMinor: 400_00 } }));

    // Act
    const report = await ok(await get(user, `/spending?month=2026-11&accountId=${user.juan}`));

    // Assert
    expect(report.totalMinor).toBe(0);
  });

  it("combines the account and category filters across a year boundary", async () => {
    // Arrange
    const user = await newUser();
    await record(user, expense(user, { occurredOn: "2026-12-05", amountMinor: 120_00 }));
    await record(user, expense(user, { occurredOn: "2027-01-05", amountMinor: 60_00 }));
    await record(
      user,
      expense(user, { occurredOn: "2027-01-05", accountId: user.bank, amountMinor: 999_00 }),
    );
    const filters = `accountId=${user.cash}&categoryId=${user.food}`;

    // Act
    const changes = await ok(await get(user, `/changes?month=2027-01&${filters}`));

    // Assert
    expect(changes.categories).toEqual([
      {
        categoryId: user.food,
        currentMinor: 60_00,
        previousAverageMinor: 40_00,
        percentChange: 50,
      },
    ]);
  });
});

describe("committed recurring movements", () => {
  it("adds future recurring amounts to the installments of each month", async () => {
    // Arrange
    const user = await newUser();
    await defineRecurring(user);
    await record(
      user,
      expense(user, {
        accountId: user.visa,
        occurredOn: "2026-11-25",
        amountMinor: 900_00,
        installments: 3,
      }),
    );

    // Act
    const report = await ok(await get(user, "/committed?from=2026-12&months=3"));

    // Assert
    expect(report.months).toEqual([
      { month: "2026-12", installmentsMinor: 300_00, recurringMinor: 200_00, totalMinor: 500_00 },
      { month: "2027-01", installmentsMinor: 300_00, recurringMinor: 200_00, totalMinor: 500_00 },
      { month: "2027-02", installmentsMinor: 300_00, recurringMinor: 200_00, totalMinor: 500_00 },
    ]);
  });

  it("leaves out skipped occurrences, paused and income templates and respects currency and account", async () => {
    // Arrange
    harness.clock.today = "2026-12-04";
    const user = await newUser();
    const skipped = await defineRecurring(user, { description: "Skipped", amountMinor: 200_00 });
    const occurrences = await ok(
      await call(user.cookie, "GET", "/recurring/occurrences?type=expense"),
    );
    const december = occurrences.items.find(
      (item: Json) => item.recurringId === skipped.id && item.dueOn === "2026-12-05",
    );
    await ok(await call(user.cookie, "POST", `/recurring/occurrences/${december.id}/skip`), 204);
    await defineRecurring(user, { amountMinor: 50_00 });
    await defineRecurring(user, { accountId: user.bank, amountMinor: 33_00 });
    await defineRecurring(user, { amountMinor: 70_00, currency: "USD" });
    const paused = await defineRecurring(user, { amountMinor: 11_00 });
    await ok(await call(user.cookie, "POST", `/recurring/${paused.id}/pause`));
    await defineRecurring(user, { type: "income", categoryId: user.salary, amountMinor: 999_00 });

    // Act
    const all = await ok(await get(user, "/committed?from=2026-12&months=2"));
    const byAccount = await ok(
      await get(user, `/committed?from=2026-12&months=1&accountId=${user.bank}`),
    );
    const dollars = await ok(await get(user, "/committed?from=2026-12&months=1&currency=USD"));

    // Assert
    expect(all.months.map((month: Json) => month.recurringMinor)).toEqual([
      50_00 + 33_00,
      200_00 + 50_00 + 33_00,
    ]);
    expect(byAccount.months[0].recurringMinor).toBe(33_00);
    expect(dollars.months[0].recurringMinor).toBe(70_00);
  });

  it("does not count a confirmed occurrence again and estimates a variable one from the last confirmed amount", async () => {
    // Arrange
    harness.clock.today = "2026-12-04";
    const user = await newUser();
    const variable = await defineRecurring(user, { amountMode: "variable", amountMinor: 100_00 });
    const occurrences = await ok(
      await call(user.cookie, "GET", "/recurring/occurrences?type=expense"),
    );
    const december = occurrences.items.find(
      (item: Json) => item.recurringId === variable.id && item.dueOn === "2026-12-05",
    );
    await ok(
      await call(user.cookie, "POST", `/recurring/occurrences/${december.id}/confirm`, {
        amountMinor: 180_00,
      }),
      201,
    );

    // Act
    const report = await ok(await get(user, "/committed?from=2026-12&months=2"));

    // Assert
    expect(
      report.months.map((month: Json) => [month.installmentsMinor, month.recurringMinor]),
    ).toEqual([
      [180_00, 0],
      [0, 180_00],
    ]);
  });

  it("never includes another user's recurring movements", async () => {
    // Arrange
    const owner = await newUser();
    const stranger = await newUser();
    await defineRecurring(owner);

    // Act
    const report = await ok(await get(stranger, "/committed?from=2026-12&months=2"));

    // Assert
    expect(report.months.every((month: Json) => month.recurringMinor === 0)).toBe(true);
  });
});
