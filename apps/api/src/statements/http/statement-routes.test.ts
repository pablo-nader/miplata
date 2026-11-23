import type { Account, CategoryDto, CategoryGroupDto } from "@miplata/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { inMemoryAccounts, inMemoryInstitutions } from "../../test/account-fakes";
import { inMemoryMovements } from "../../test/movement-fakes";
import { emptyReports } from "../../test/report-fakes";
import type { DetailLines, StatementRepository } from "../application/statement-repository";
import type { AmountLine, StatementRow } from "../domain/statement-summary";

const GROUP = "00000000-0000-4000-8000-0000000000a1";
const INTEREST = "00000000-0000-4000-8000-0000000000a2";
const ADJUSTMENT = "00000000-0000-4000-8000-0000000000a3";
const FOOD = "00000000-0000-4000-8000-0000000000a4";
const ABSENT = "00000000-0000-4000-8000-0000000000ff";

function category(id: string, nameKey: string, groupId: string): CategoryDto {
  return {
    id,
    type: "expense",
    groupId,
    nameKey,
    name: null,
    icon: null,
    color: 1,
    isActive: true,
    sortOrder: 0,
  };
}

const categories = [
  category(INTEREST, "defaults.category.interest", GROUP),
  category(ADJUSTMENT, "defaults.category.adjustment", GROUP),
  category(FOOD, "defaults.category.food", "other-group"),
];

const groups: CategoryGroupDto[] = [
  { id: GROUP, nameKey: "defaults.group.financialCharges", name: null, sortOrder: 0 },
];

type Scripted = {
  rows: StatementRow[];
  lines: AmountLine[];
  detail: DetailLines;
};

function scriptedStatements(state: Scripted) {
  const calls = {
    ensureOpen: vi.fn(),
    updateDates: vi.fn(),
    setBankFigures: vi.fn(),
  };
  const repository: StatementRepository = {
    async ensureOpen(...args) {
      calls.ensureOpen(...args);
    },
    async rows(_userId, accountId) {
      return state.rows.filter((row) => row.accountId === accountId);
    },
    async find(_userId, statementId) {
      return state.rows.find((row) => row.id === statementId) ?? null;
    },
    async amountLines() {
      return state.lines;
    },
    async detailLines() {
      return state.detail;
    },
    async updateDates(...args) {
      calls.updateDates(...args);
      return true;
    },
    async setBankFigures(...args) {
      calls.setBankFigures(...args);
      return true;
    },
  };
  return { repository, calls };
}

let app: ReturnType<typeof createApp>;
let state: Scripted;
let calls: ReturnType<typeof scriptedStatements>["calls"];
let movements: ReturnType<typeof inMemoryMovements>;
let accountsStore: ReturnType<typeof inMemoryAccounts>;
let card: Account;
let bank: Account;
let statementId: string;

function call(method: string, path: string, user: string | null, body?: unknown) {
  return app.request(`/api${path}`, {
    method,
    headers: {
      ...(user ? { "x-user": user } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function charge(changes: Record<string, unknown> = {}) {
  return { categoryId: INTEREST, currency: "ARS", amountMinor: 30_00, ...changes };
}

const arsOnly = [{ currency: "ARS" as const, openingBalanceMinor: 0 }];
const both = [...arsOnly, { currency: "USD" as const, openingBalanceMinor: 0 }];

beforeEach(async () => {
  accountsStore = inMemoryAccounts();
  card = await accountsStore.repository.create("alice", {
    type: "credit_card",
    institutionId: null,
    name: "Visa",
    closingDay: 27,
    dueDay: 5,
    currencies: both,
  });
  bank = await accountsStore.repository.create("alice", {
    type: "bank",
    institutionId: null,
    name: "Bank",
    currencies: both,
    closingDay: null,
    dueDay: null,
  });
  statementId = "00000000-0000-4000-8000-0000000000b1";
  state = {
    rows: [
      {
        id: statementId,
        accountId: card.id,
        periodMonth: "2026-11",
        closingDate: "2026-11-27",
        dueDate: "2026-12-05",
        minimumMinor: { ARS: null, USD: null },
        bankTotalMinor: { ARS: null, USD: null },
      },
    ],
    lines: [{ statementId, currency: "ARS", kind: "own", amountMinor: 100_00 }],
    detail: { purchases: [], others: [], charges: [], payments: [] },
  };
  const scripted = scriptedStatements(state);
  calls = scripted.calls;
  movements = inMemoryMovements();
  app = createApp({
    readVersion: () => "test",
    authHandler: async () => new Response("auth"),
    resolveSession: async (headers) => headers.get("x-user") ?? null,
    users: { findById: async () => null, updateLocale: async () => null },
    accounts: {
      accounts: accountsStore.repository,
      everyAccount: accountsStore.repository,
      institutions: inMemoryInstitutions([]),
    },
    people: accountsStore.repository,
    categories: {
      findCategory: async (_userId: string, id: string) =>
        categories.find((item) => item.id === id) ?? null,
      listCategories: async () => categories,
      listGroups: async () => groups,
    } as unknown as CategoryRepository,
    movements: movements.repository,
    statements: scripted.repository,
    reports: emptyReports(),
    today: () => "2026-11-23",
  });
});

describe("GET /api/statements", () => {
  it("rejects a request without a session", async () => {
    // Arrange
    const anonymous = null;

    // Act
    const response = await call("GET", `/statements?accountId=${card.id}`, anonymous);

    // Assert
    expect(response.status).toBe(401);
  });

  it("lists the card's statements and opens the current one", async () => {
    // Arrange
    const user = "alice";

    // Act
    const response = await call("GET", `/statements?accountId=${card.id}`, user);

    // Assert
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { totals: { totalMinor: number }[] }[] };
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.totals[0]?.totalMinor).toBe(100_00);
    expect(calls.ensureOpen).toHaveBeenCalledWith(
      "alice",
      { accountId: card.id, closingDay: 27, dueDay: 5 },
      "2026-11-23",
    );
  });

  it("does not open a statement for an inactive card or a card without days", async () => {
    // Arrange
    await accountsStore.repository.setActive("alice", card.id, false);

    // Act
    const response = await call("GET", `/statements?accountId=${card.id}`, "alice");

    // Assert
    expect(response.status).toBe(200);
    expect(calls.ensureOpen).not.toHaveBeenCalled();
  });

  it.each([
    ["a query without an account", "/statements"],
    ["an account that is not a card", "bank"],
    ["an unknown account", `/statements?accountId=${ABSENT}`],
  ])("answers an error for %s", async (_label, path) => {
    // Arrange
    const target = path === "bank" ? `/statements?accountId=${bank.id}` : path;

    // Act
    const response = await call("GET", target, "alice");

    // Assert
    expect([400, 404]).toContain(response.status);
  });

  it("does not show another user's card", async () => {
    // Arrange
    const stranger = "mallory";

    // Act
    const response = await call("GET", `/statements?accountId=${card.id}`, stranger);

    // Assert
    expect(response.status).toBe(404);
  });
});

describe("GET /api/statements/:id", () => {
  it("returns the detail with the totals", async () => {
    // Arrange
    state.detail.charges = [
      {
        movementId: "m1",
        categoryId: ADJUSTMENT,
        description: null,
        occurredOn: "2026-11-27",
        currency: "ARS",
        amountMinor: 5_00,
      },
    ];

    // Act
    const response = await call("GET", `/statements/${statementId}`, "alice");

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: statementId,
      charges: [{ movementId: "m1", isAdjustment: true }],
    });
  });

  it("answers 404 for a malformed, unknown or foreign id", async () => {
    // Arrange
    const paths = ["/statements/nope", `/statements/${ABSENT}`];

    // Act
    const statuses = await Promise.all(
      paths.map(async (path) => (await call("GET", path, "alice")).status),
    );
    const foreign = await call("GET", `/statements/${statementId}`, "mallory");

    // Assert
    expect(statuses).toEqual([404, 404]);
    expect(foreign.status).toBe(404);
  });
});

describe("PATCH /api/statements/:id", () => {
  it("updates the dates", async () => {
    // Arrange
    const body = { closingDate: "2026-11-25", dueDate: "2026-12-03" };

    // Act
    const response = await call("PATCH", `/statements/${statementId}`, "alice", body);

    // Assert
    expect(response.status).toBe(200);
    expect(calls.updateDates).toHaveBeenCalledWith("alice", statementId, body, {
      accountId: card.id,
      closingDay: 27,
      dueDay: 5,
    });
  });

  it.each([
    [
      "a closing date outside the month",
      { closingDate: "2026-12-01", dueDate: "2026-12-10" },
      "closing_outside_period",
    ],
    [
      "a due date before the closing date",
      { closingDate: "2026-11-20", dueDate: "2026-11-19" },
      "due_before_closing",
    ],
  ])("rejects %s", async (_label, body, reason) => {
    // Arrange
    const request = body;

    // Act
    const response = await call("PATCH", `/statements/${statementId}`, "alice", request);

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request", reason });
    expect(calls.updateDates).not.toHaveBeenCalled();
  });

  it("rejects a card that lost its days", async () => {
    // Arrange
    await accountsStore.repository.update("alice", card.id, { closingDay: null, dueDay: null });

    // Act
    const response = await call("PATCH", `/statements/${statementId}`, "alice", {
      closingDate: "2026-11-25",
      dueDate: "2026-12-03",
    });

    // Assert
    expect(await response.json()).toEqual({
      error: "invalid_request",
      reason: "card_without_schedule",
    });
  });

  it.each([
    [
      "a malformed id",
      "/statements/nope",
      { closingDate: "2026-11-25", dueDate: "2026-12-03" },
      404,
    ],
    [
      "a malformed body",
      `/statements/${"00000000-0000-4000-8000-0000000000b1"}`,
      { closingDate: "x" },
      400,
    ],
    [
      "an unknown statement",
      `/statements/${ABSENT}`,
      { closingDate: "2026-11-25", dueDate: "2026-12-03" },
      404,
    ],
  ])("answers an error for %s", async (_label, path, body, status) => {
    // Arrange
    const request = body;

    // Act
    const response = await call("PATCH", path, "alice", request);

    // Assert
    expect(response.status).toBe(status);
  });
});

describe("PUT /api/statements/:id/bank-figures", () => {
  it("stores the figures", async () => {
    // Arrange
    const body = { bankTotalArsMinor: 130_00 };

    // Act
    const response = await call("PUT", `/statements/${statementId}/bank-figures`, "alice", body);

    // Assert
    expect(response.status).toBe(200);
    expect(calls.setBankFigures).toHaveBeenCalledWith("alice", statementId, {
      bankTotalArsMinor: 130_00,
      bankTotalUsdMinor: null,
      minimumArsMinor: null,
      minimumUsdMinor: null,
    });
  });

  it("rejects a currency the card does not hold", async () => {
    // Arrange
    await accountsStore.repository.update("alice", card.id, { currencies: arsOnly });

    // Act
    const response = await call("PUT", `/statements/${statementId}/bank-figures`, "alice", {
      minimumUsdMinor: 10_00,
    });

    // Assert
    expect(await response.json()).toEqual({
      error: "invalid_request",
      reason: "currency_not_in_account",
    });
    expect(calls.setBankFigures).not.toHaveBeenCalled();
  });

  it.each([
    ["a malformed id", "/statements/nope/bank-figures", {}, 404],
    [
      "a negative amount",
      `/statements/${"00000000-0000-4000-8000-0000000000b1"}/bank-figures`,
      { bankTotalArsMinor: -1 },
      400,
    ],
    ["an unknown statement", `/statements/${ABSENT}/bank-figures`, {}, 404],
  ])("answers an error for %s", async (_label, path, body, status) => {
    // Arrange
    const request = body;

    // Act
    const response = await call("PUT", path, "alice", request);

    // Assert
    expect(response.status).toBe(status);
  });
});

describe("charges", () => {
  it("creates a charge forced into the statement", async () => {
    // Arrange
    const body = charge({ description: "Interest" });

    // Act
    const response = await call("POST", `/statements/${statementId}/charges`, "alice", body);

    // Assert
    expect(response.status).toBe(201);
    expect(movements.plans[0]).toMatchObject({
      type: "expense",
      statementId,
      occurredOn: "2026-11-27",
      description: "Interest",
    });
  });

  it.each([
    ["a category outside Financial charges", charge({ categoryId: FOOD }), "category_not_allowed"],
    ["an unknown category", charge({ categoryId: ABSENT }), "category_not_found"],
    ["a currency the card lacks", charge({ currency: "EUR" }), null],
  ])("rejects %s", async (_label, body, reason) => {
    // Arrange
    const request = body;

    // Act
    const response = await call("POST", `/statements/${statementId}/charges`, "alice", request);

    // Assert
    expect(response.status).toBe(400);
    if (reason) {
      expect(await response.json()).toEqual({ error: "invalid_request", reason });
    }
    expect(movements.plans).toHaveLength(0);
  });

  it.each([
    ["a malformed id", "/statements/nope/charges", 404],
    ["an unknown statement", `/statements/${ABSENT}/charges`, 404],
  ])("answers 404 for %s", async (_label, path, status) => {
    // Arrange
    const body = charge();

    // Act
    const response = await call("POST", path, "alice", body);

    // Assert
    expect(response.status).toBe(status);
  });

  it("edits and deletes only a charge of that statement", async () => {
    // Arrange
    const created = await movements.repository.create("alice", {
      type: "expense",
      occurredOn: "2026-11-27",
      description: null,
      categoryId: INTEREST,
      postings: [{ accountId: card.id, currency: "ARS", amountMinor: -30_00 }],
      installments: [],
      statementPlan: null,
      statementId,
    });
    state.detail.charges = [
      {
        movementId: created.id,
        categoryId: INTEREST,
        description: null,
        occurredOn: "2026-11-27",
        currency: "ARS",
        amountMinor: 30_00,
      },
    ];

    // Act
    const edited = await call(
      "PUT",
      `/statements/${statementId}/charges/${created.id}`,
      "alice",
      charge({ amountMinor: 10_00 }),
    );
    const foreign = await call(
      "PUT",
      `/statements/${statementId}/charges/${ABSENT}`,
      "alice",
      charge(),
    );
    const removed = await call(
      "DELETE",
      `/statements/${statementId}/charges/${created.id}`,
      "alice",
    );
    const gone = await call("DELETE", `/statements/${statementId}/charges/${ABSENT}`, "alice");

    // Assert
    expect(edited.status).toBe(200);
    expect(foreign.status).toBe(404);
    expect(removed.status).toBe(200);
    expect(gone.status).toBe(404);
    expect(await movements.repository.find("alice", created.id)).toBeNull();
  });

  it("answers 404 for a malformed charge id and a malformed body", async () => {
    // Arrange
    const path = `/statements/${statementId}/charges`;

    // Act
    const badId = await call("PUT", `${path}/nope`, "alice", charge());
    const badBody = await call("PUT", `${path}/${ABSENT}`, "alice", {});
    const badDelete = await call("DELETE", `${path}/nope`, "alice");

    // Assert
    expect(badId.status).toBe(404);
    expect(badBody.status).toBe(400);
    expect(badDelete.status).toBe(404);
  });
});

describe("POST /api/statements/:id/payments", () => {
  it("creates a transfer per currency linked to the statement", async () => {
    // Arrange
    const body = {
      fromAccountId: bank.id,
      occurredOn: "2026-12-05",
      arsMinor: 50_00,
      usdMinor: 5_00,
    };

    // Act
    const response = await call("POST", `/statements/${statementId}/payments`, "alice", body);

    // Assert
    expect(response.status).toBe(201);
    expect(movements.plans).toHaveLength(2);
    expect(movements.plans.every((plan) => plan.statementId === statementId)).toBe(true);
  });

  it.each([
    [
      "an unknown source account",
      { fromAccountId: ABSENT, occurredOn: "2026-12-05", arsMinor: 1_00 },
      "account_not_found",
    ],
    [
      "the card as the source",
      { fromAccountId: "card", occurredOn: "2026-12-05", arsMinor: 1_00 },
      "account_not_allowed",
    ],
  ])("rejects %s", async (_label, body, reason) => {
    // Arrange
    const request = {
      ...body,
      fromAccountId: body.fromAccountId === "card" ? card.id : body.fromAccountId,
    };

    // Act
    const response = await call("POST", `/statements/${statementId}/payments`, "alice", request);

    // Assert
    expect(await response.json()).toEqual({ error: "invalid_request", reason });
    expect(movements.plans).toHaveLength(0);
  });

  it.each([
    [
      "a malformed id",
      "/statements/nope/payments",
      { fromAccountId: ABSENT, occurredOn: "2026-12-05", arsMinor: 1 },
      404,
    ],
    [
      "a body without amounts",
      `/statements/${"00000000-0000-4000-8000-0000000000b1"}/payments`,
      { fromAccountId: ABSENT, occurredOn: "2026-12-05" },
      400,
    ],
    [
      "an unknown statement",
      `/statements/${ABSENT}/payments`,
      { fromAccountId: ABSENT, occurredOn: "2026-12-05", arsMinor: 1 },
      404,
    ],
  ])("answers an error for %s", async (_label, path, body, status) => {
    // Arrange
    const request = body;

    // Act
    const response = await call("POST", path, "alice", request);

    // Assert
    expect(response.status).toBe(status);
  });
});

describe("POST /api/statements/:id/adjustment", () => {
  function post() {
    return call("POST", `/statements/${statementId}/adjustment`, "alice", { currency: "ARS" });
  }

  it("records the difference with the bank as an Adjustment charge", async () => {
    // Arrange
    const row = state.rows[0] as StatementRow;
    state.rows[0] = { ...row, bankTotalMinor: { ARS: 130_00, USD: null } };

    // Act
    const response = await post();

    // Assert
    expect(response.status).toBe(200);
    expect(movements.plans[0]).toMatchObject({
      categoryId: ADJUSTMENT,
      statementId,
      installments: [{ amountMinor: 30_00 }],
    });
  });

  it("replaces the adjustment charges that already exist with a single one", async () => {
    // Arrange
    const row = state.rows[0] as StatementRow;
    state.rows[0] = { ...row, bankTotalMinor: { ARS: 160_00, USD: null } };
    const first = await movements.repository.create("alice", {
      type: "expense",
      occurredOn: "2026-11-27",
      description: null,
      categoryId: ADJUSTMENT,
      postings: [{ accountId: card.id, currency: "ARS", amountMinor: -10_00 }],
      installments: [],
      statementPlan: null,
      statementId,
    });
    const second = await movements.repository.create("alice", {
      type: "expense",
      occurredOn: "2026-11-27",
      description: null,
      categoryId: ADJUSTMENT,
      postings: [{ accountId: card.id, currency: "ARS", amountMinor: -20_00 }],
      installments: [],
      statementPlan: null,
      statementId,
    });
    const line = (id: string, amountMinor: number) => ({
      movementId: id,
      categoryId: ADJUSTMENT,
      description: null,
      occurredOn: "2026-11-27",
      currency: "ARS" as const,
      amountMinor,
    });
    state.detail.charges = [line(first.id, 10_00), line(second.id, 20_00)];
    state.lines.push({ statementId, currency: "ARS", kind: "charges", amountMinor: 30_00 });

    // Act
    const response = await post();

    // Assert
    expect(response.status).toBe(200);
    expect(await movements.repository.find("alice", second.id)).toBeNull();
    expect(movements.plans.at(-1)).toMatchObject({ installments: [{ amountMinor: 60_00 }] });
  });

  it.each([
    ["no bank total", null, "bank_total_missing"],
    ["no difference", 100_00, "no_positive_difference"],
    ["a bank total below the calculation", 90_00, "no_positive_difference"],
  ])("rejects an adjustment with %s", async (_label, bankTotal, reason) => {
    // Arrange
    const row = state.rows[0] as StatementRow;
    state.rows[0] = { ...row, bankTotalMinor: { ARS: bankTotal, USD: null } };

    // Act
    const response = await post();

    // Assert
    expect(await response.json()).toEqual({ error: "invalid_request", reason });
    expect(movements.plans).toHaveLength(0);
  });

  it("rejects a currency the card does not hold", async () => {
    // Arrange
    await accountsStore.repository.update("alice", card.id, { currencies: arsOnly });

    // Act
    const response = await call("POST", `/statements/${statementId}/adjustment`, "alice", {
      currency: "USD",
    });

    // Assert
    expect(await response.json()).toEqual({
      error: "invalid_request",
      reason: "currency_not_in_account",
    });
  });

  it("needs the Adjustment category", async () => {
    // Arrange
    const row = state.rows[0] as StatementRow;
    state.rows[0] = { ...row, bankTotalMinor: { ARS: 130_00, USD: null } };
    categories.splice(1, 1);

    // Act
    const response = await post();
    categories.splice(1, 0, category(ADJUSTMENT, "defaults.category.adjustment", GROUP));

    // Assert
    expect(await response.json()).toEqual({
      error: "invalid_request",
      reason: "category_not_found",
    });
  });

  it.each([
    ["a malformed id", "/statements/nope/adjustment", { currency: "ARS" }, 404],
    [
      "a malformed body",
      `/statements/${"00000000-0000-4000-8000-0000000000b1"}/adjustment`,
      {},
      400,
    ],
    ["an unknown statement", `/statements/${ABSENT}/adjustment`, { currency: "ARS" }, 404],
  ])("answers an error for %s", async (_label, path, body, status) => {
    // Arrange
    const request = body;

    // Act
    const response = await call("POST", path, "alice", request);

    // Assert
    expect(response.status).toBe(status);
  });
});
