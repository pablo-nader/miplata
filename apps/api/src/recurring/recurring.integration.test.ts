import type { CategoriesResponse } from "@miplata/shared";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

beforeEach(() => {
  harness.clock.today = "2026-11-23";
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
  const userId = await harness.signUpWithGoogle(`recurring-${counter}@example.com`);
  const cookie = await harness.cookieFor(userId);
  const account = async (body: Json) =>
    (await ok(await call(cookie, "POST", "/accounts", body), 201)).id as string;
  const catalog = (await ok(await call(cookie, "GET", "/categories"))) as CategoriesResponse;
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
    food: catalog.expenseGroups[0]?.categories[0]?.id as string,
    salary: catalog.income[0]?.id as string,
  };
}

type User = Awaited<ReturnType<typeof newUser>>;

function rent(user: User, changes: Json = {}) {
  return {
    type: "expense",
    frequency: "monthly",
    dayOfMonth: 5,
    amountMode: "fixed",
    amountMinor: 1_000_00,
    currency: "ARS",
    accountId: user.cash,
    categoryId: user.food,
    description: "Rent",
    startsOn: "2026-10-01",
    ...changes,
  };
}

async function define(user: User, changes: Json = {}) {
  return ok(await call(user.cookie, "POST", "/recurring", rent(user, changes)), 201);
}

async function pending(user: User, query = ""): Promise<Json[]> {
  const body = await ok(await call(user.cookie, "GET", `/recurring/occurrences${query}`));
  return body.items as Json[];
}

async function balanceOf(user: User, accountId: string, currency = "ARS") {
  const account = await ok(await call(user.cookie, "GET", `/accounts/${accountId}`));
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

const MISSING = "00000000-0000-4000-8000-000000000001";

const endpoints = [
  ["GET", "/recurring"],
  ["POST", "/recurring"],
  ["GET", "/recurring/occurrences"],
  ["POST", `/recurring/occurrences/${MISSING}/confirm`],
  ["POST", `/recurring/occurrences/${MISSING}/skip`],
  ["GET", `/recurring/${MISSING}`],
  ["PUT", `/recurring/${MISSING}`],
  ["POST", `/recurring/${MISSING}/pause`],
  ["POST", `/recurring/${MISSING}/resume`],
  ["POST", `/recurring/${MISSING}/end`],
] as const;

describe("authentication", () => {
  it.each(endpoints)("%s %s requires a session", async (method, path) => {
    // Arrange
    const body = method === "GET" ? undefined : {};

    // Act
    const response = await call(undefined, method, path, body);

    // Assert
    expect(response.status).toBe(401);
  });
});

describe("data isolation", () => {
  it("never shows or changes another user's recurring movements", async () => {
    // Arrange
    const alice = await newUser();
    const bob = await newUser();
    const mine = await define(alice);
    const [occurrence] = await pending(alice);
    const occurrenceId = (occurrence as Json).id as string;

    // Act
    const results = await Promise.all([
      call(bob.cookie, "GET", "/recurring"),
      call(bob.cookie, "GET", `/recurring/${mine.id}`),
      call(bob.cookie, "PUT", `/recurring/${mine.id}`, rent(bob)),
      call(bob.cookie, "POST", `/recurring/${mine.id}/pause`),
      call(bob.cookie, "POST", `/recurring/${mine.id}/resume`),
      call(bob.cookie, "POST", `/recurring/${mine.id}/end`, {}),
      call(bob.cookie, "GET", "/recurring/occurrences"),
      call(bob.cookie, "POST", `/recurring/occurrences/${occurrenceId}/confirm`, {}),
      call(bob.cookie, "POST", `/recurring/occurrences/${occurrenceId}/skip`),
    ]);

    // Assert
    expect(await (results[0] as Response).json()).toEqual({ items: [] });
    expect(results.slice(1, 7).map((response) => response.status)).toEqual([
      404, 404, 404, 404, 404, 200,
    ]);
    expect(((await (results[6] as Response).json()) as Json).items).toEqual([]);
    expect(results.slice(7).map((response) => response.status)).toEqual([404, 404]);
    expect(await pending(alice)).toHaveLength(3);
    expect(await count("movement", alice.userId)).toBe(0);
  });

  it("rejects another user's account and category when defining or confirming", async () => {
    // Arrange
    const alice = await newUser();
    const bob = await newUser();
    await define(alice);
    const [occurrence] = await pending(alice);

    // Act
    const foreignAccount = await call(
      alice.cookie,
      "POST",
      "/recurring",
      rent(alice, { accountId: bob.cash }),
    );
    const foreignCategory = await call(
      alice.cookie,
      "POST",
      "/recurring",
      rent(alice, { categoryId: bob.food }),
    );
    const foreignOverride = await call(
      alice.cookie,
      "POST",
      `/recurring/occurrences/${(occurrence as Json).id}/confirm`,
      { accountId: bob.cash },
    );

    // Assert
    expect((await ok(foreignAccount, 400)).reason).toBe("account_not_found");
    expect((await ok(foreignCategory, 400)).reason).toBe("category_not_found");
    expect((await ok(foreignOverride, 400)).reason).toBe("account_not_found");
  });
});

describe("defining recurring movements", () => {
  it("creates, reads, lists and validates", async () => {
    // Arrange
    const user = await newUser();

    // Act
    const created = await define(user, { frequency: "yearly", startsOn: "2026-03-10" });
    const read = await ok(await call(user.cookie, "GET", `/recurring/${created.id}`));
    const listed = await ok(await call(user.cookie, "GET", "/recurring"));
    const noAmount = await call(
      user.cookie,
      "POST",
      "/recurring",
      rent(user, { amountMinor: null }),
    );
    const wrongType = await call(user.cookie, "POST", "/recurring", rent(user, { type: "income" }));

    // Assert
    expect(created).toMatchObject({ frequency: "yearly", monthOfYear: 3, isPaused: false });
    expect(read).toEqual(created);
    expect(listed.items).toEqual([created]);
    expect(noAmount.status).toBe(400);
    expect((await ok(wrongType, 400)).reason).toBe("category_type_mismatch");
  });
});

describe("generating occurrences", () => {
  it("creates due occurrences when read, idempotently, without a scheduled job", async () => {
    // Arrange
    const user = await newUser();
    await define(user);

    // Act
    const first = await pending(user);
    const second = await pending(user);
    const concurrent = await Promise.all([pending(user), pending(user)]);

    // Assert
    expect(first.map((item) => item.dueOn)).toEqual(["2026-10-05", "2026-11-05", "2026-12-05"]);
    expect(second).toEqual(first);
    expect(concurrent).toEqual([first, first]);
    expect(await count("recurring_occurrence", user.userId)).toBe(3);
  });

  it("clamps day 31 to the last day of short months", async () => {
    // Arrange
    const user = await newUser();
    harness.clock.today = "2026-02-20";
    await define(user, { dayOfMonth: 31, startsOn: "2026-01-01" });

    // Act
    const dueDates = (await pending(user)).map((item) => item.dueOn);

    // Assert
    expect(dueDates).toEqual(["2026-01-31", "2026-02-28"]);
  });

  it("generates later months as time passes without duplicating older ones", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    await pending(user);
    harness.clock.today = "2027-01-10";

    // Act
    const dueDates = (await pending(user)).map((item) => item.dueOn);

    // Assert
    expect(dueDates).toEqual([
      "2026-10-05",
      "2026-11-05",
      "2026-12-05",
      "2027-01-05",
      "2027-02-05",
    ]);
  });

  it("splits to pay and to collect by movement type", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    await define(user, { type: "income", categoryId: user.salary, description: "Salary" });

    // Act
    const toPay = await pending(user, "?type=expense");
    const toCollect = await pending(user, "?type=income");

    // Assert
    expect(new Set(toPay.map((item) => item.type))).toEqual(new Set(["expense"]));
    expect(new Set(toCollect.map((item) => item.type))).toEqual(new Set(["income"]));
    expect(toCollect.length).toBe(toPay.length);
  });

  it("does not count pending occurrences in balances or movements", async () => {
    // Arrange
    const user = await newUser();
    await define(user);

    // Act
    await pending(user);

    // Assert
    expect(await balanceOf(user, user.cash)).toBe(0);
    expect(await count("movement", user.userId)).toBe(0);
  });
});

describe("confirming an occurrence", () => {
  it("creates exactly one movement and then reports it as resolved", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    const [occurrence] = await pending(user);
    const id = (occurrence as Json).id as string;

    // Act
    const confirmed = await ok(
      await call(user.cookie, "POST", `/recurring/occurrences/${id}/confirm`, {}),
      201,
    );
    const again = await call(user.cookie, "POST", `/recurring/occurrences/${id}/confirm`, {});
    const skip = await call(user.cookie, "POST", `/recurring/occurrences/${id}/skip`);

    // Assert
    expect(confirmed).toMatchObject({
      type: "expense",
      occurredOn: "2026-10-05",
      description: "Rent",
      account: { accountId: user.cash, amountMinor: 1_000_00 },
    });
    expect(again.status).toBe(409);
    expect(skip.status).toBe(409);
    expect(await count("movement", user.userId)).toBe(1);
    expect(await balanceOf(user, user.cash)).toBe(-1_000_00);
    expect((await pending(user)).map((item) => item.dueOn)).toEqual(["2026-11-05", "2026-12-05"]);
  });

  it("links the movement to its occurrence", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    const [occurrence] = await pending(user);
    const id = (occurrence as Json).id as string;

    // Act
    await ok(await call(user.cookie, "POST", `/recurring/occurrences/${id}/confirm`, {}), 201);

    // Assert
    const linked = await harness.pool.query(
      `select o.status, m.recurring_occurrence_id from recurring_occurrence o
       join movement m on m.id = o.movement_id where o.id = $1`,
      [id],
    );
    expect(linked.rows).toEqual([{ status: "confirmed", recurring_occurrence_id: id }]);
  });

  it("creates a single movement when confirmed twice at the same time", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    const [occurrence] = await pending(user);
    const path = `/recurring/occurrences/${(occurrence as Json).id}/confirm`;

    // Act
    const responses = await Promise.all([
      call(user.cookie, "POST", path, {}),
      call(user.cookie, "POST", path, {}),
    ]);

    // Assert
    expect(responses.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await count("movement", user.userId)).toBe(1);
  });

  it("applies overrides of amount, account and date", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    const [occurrence] = await pending(user);

    // Act
    const confirmed = await ok(
      await call(user.cookie, "POST", `/recurring/occurrences/${(occurrence as Json).id}/confirm`, {
        amountMinor: 1_250_50,
        accountId: user.bank,
        occurredOn: "2026-10-07",
      }),
      201,
    );

    // Assert
    expect(confirmed).toMatchObject({
      occurredOn: "2026-10-07",
      account: { accountId: user.bank, amountMinor: 1_250_50 },
    });
    expect(await balanceOf(user, user.bank)).toBe(-1_250_50);
    expect(await balanceOf(user, user.cash)).toBe(0);
  });

  it("requires an amount for a variable occurrence and suggests the last confirmed one", async () => {
    // Arrange
    const user = await newUser();
    await define(user, { amountMode: "variable", amountMinor: null });
    const [first, second] = await pending(user);

    // Act
    const missing = await call(
      user.cookie,
      "POST",
      `/recurring/occurrences/${(first as Json).id}/confirm`,
      {},
    );
    await ok(
      await call(user.cookie, "POST", `/recurring/occurrences/${(first as Json).id}/confirm`, {
        amountMinor: 777_00,
      }),
      201,
    );
    const next = (await pending(user))[0] as Json;

    // Assert
    expect((first as Json).suggestedAmountMinor).toBeNull();
    expect((await ok(missing, 400)).error).toBe("amount_required");
    expect(next.id).toBe((second as Json).id);
    expect(next.suggestedAmountMinor).toBe(777_00);
  });

  it("books a credit card recurring expense in the same statement as a card purchase", async () => {
    // Arrange
    const user = await newUser();
    await define(user, { accountId: user.visa, dayOfMonth: 25, startsOn: "2026-11-01" });
    const [occurrence] = await pending(user);
    const direct = await ok(
      await call(user.cookie, "POST", "/movements", {
        type: "expense",
        occurredOn: "2026-11-25",
        categoryId: user.food,
        accountId: user.visa,
        currency: "ARS",
        amountMinor: 1_000_00,
      }),
      201,
    );

    // Act
    const confirmed = await ok(
      await call(
        user.cookie,
        "POST",
        `/recurring/occurrences/${(occurrence as Json).id}/confirm`,
        {},
      ),
      201,
    );

    // Assert
    expect(confirmed.installments).toHaveLength(1);
    expect(confirmed.installments[0].periodMonth).toBe(direct.installments[0].periodMonth);
    expect(confirmed.installments[0].statementId).toBe(direct.installments[0].statementId);
    expect(confirmed.installments[0].statementId).not.toBeNull();
    expect(await balanceOf(user, user.visa)).toBe(-2_000_00);
  });

  it("blocks deleting a movement that confirmed an occurrence", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    const [occurrence] = await pending(user);
    const movement = await ok(
      await call(
        user.cookie,
        "POST",
        `/recurring/occurrences/${(occurrence as Json).id}/confirm`,
        {},
      ),
      201,
    );

    // Act
    const removed = await call(user.cookie, "DELETE", `/movements/${movement.id}`);

    // Assert
    expect(removed.status).toBe(409);
  });
});

describe("skipping an occurrence", () => {
  it("records nothing and removes it from the list", async () => {
    // Arrange
    const user = await newUser();
    await define(user);
    const [occurrence] = await pending(user);
    const path = `/recurring/occurrences/${(occurrence as Json).id}`;

    // Act
    const skipped = await call(user.cookie, "POST", `${path}/skip`);
    const again = await call(user.cookie, "POST", `${path}/skip`);
    const confirm = await call(user.cookie, "POST", `${path}/confirm`, {});

    // Assert
    expect(skipped.status).toBe(204);
    expect(again.status).toBe(409);
    expect(confirm.status).toBe(409);
    expect(await count("movement", user.userId)).toBe(0);
    expect((await pending(user)).map((item) => item.dueOn)).toEqual(["2026-11-05", "2026-12-05"]);
  });
});

describe("pausing, resuming and ending", () => {
  it("stops future occurrences while paused and does not backfill after resuming", async () => {
    // Arrange
    const user = await newUser();
    const created = await define(user);
    await pending(user);

    // Act
    const paused = await ok(await call(user.cookie, "POST", `/recurring/${created.id}/pause`));
    const whilePaused = (await pending(user)).map((item) => item.dueOn);
    harness.clock.today = "2027-02-10";
    const stillPaused = (await pending(user)).map((item) => item.dueOn);
    await ok(await call(user.cookie, "POST", `/recurring/${created.id}/resume`));
    const afterResume = (await pending(user)).map((item) => item.dueOn);

    // Assert
    expect(paused.isPaused).toBe(true);
    expect(whilePaused).toEqual(["2026-10-05", "2026-11-05"]);
    expect(stillPaused).toEqual(["2026-10-05", "2026-11-05"]);
    expect(afterResume).toEqual(["2026-10-05", "2026-11-05", "2027-03-05"]);
  });

  it("ends a recurring movement and drops its later occurrences", async () => {
    // Arrange
    const user = await newUser();
    const created = await define(user);
    await pending(user);

    // Act
    const ended = await ok(
      await call(user.cookie, "POST", `/recurring/${created.id}/end`, { endsOn: "2026-11-30" }),
    );
    harness.clock.today = "2027-06-01";
    const dueDates = (await pending(user)).map((item) => item.dueOn);
    const resume = await call(user.cookie, "POST", `/recurring/${created.id}/resume`);
    const before = await call(user.cookie, "POST", `/recurring/${created.id}/end`, {
      endsOn: "2026-09-30",
    });

    // Assert
    expect(ended.endsOn).toBe("2026-11-30");
    expect(dueDates).toEqual(["2026-10-05", "2026-11-05"]);
    expect(resume.status).toBe(409);
    expect(before.status).toBe(400);
  });
});

describe("editing a recurring movement", () => {
  it("changes only future occurrences and leaves recorded movements untouched", async () => {
    // Arrange
    const user = await newUser();
    const created = await define(user);
    const [october] = await pending(user);
    const recorded = await ok(
      await call(user.cookie, "POST", `/recurring/occurrences/${(october as Json).id}/confirm`, {}),
      201,
    );

    // Act
    await ok(
      await call(
        user.cookie,
        "PUT",
        `/recurring/${created.id}`,
        rent(user, { dayOfMonth: 10, amountMinor: 2_000_00, description: "New rent" }),
      ),
    );
    const upcoming = await pending(user);
    const movement = await ok(await call(user.cookie, "GET", `/movements/${recorded.id}`));

    // Assert
    expect(upcoming.map((item) => item.dueOn)).toEqual(["2026-11-05", "2026-12-10"]);
    expect(upcoming.map((item) => item.suggestedAmountMinor)).toEqual([2_000_00, 2_000_00]);
    expect(movement).toEqual(recorded);
    expect(await count("recurring_occurrence", user.userId)).toBeGreaterThanOrEqual(3);
  });

  it("does not create occurrences in the past for the new schedule", async () => {
    // Arrange
    const user = await newUser();
    const created = await define(user);
    await pending(user);

    // Act
    await ok(
      await call(user.cookie, "PUT", `/recurring/${created.id}`, rent(user, { dayOfMonth: 15 })),
    );
    const dueDates = (await pending(user)).map((item) => item.dueOn);

    // Assert
    expect(dueDates).toEqual(["2026-10-05", "2026-11-05", "2026-12-15"]);
  });
});
