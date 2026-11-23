import type { CategoryDto } from "@miplata/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { inMemoryAccounts, inMemoryInstitutions } from "../../test/account-fakes";
import { inMemoryMovements } from "../../test/movement-fakes";

const CATEGORY = "00000000-0000-4000-8000-000000000009";

const category: CategoryDto = {
  id: CATEGORY,
  type: "expense",
  groupId: null,
  nameKey: null,
  name: "Food",
  icon: null,
  color: 1,
  isActive: true,
  sortOrder: 0,
};

let app: ReturnType<typeof createApp>;
let cashId: string;

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

function expense(changes: Record<string, unknown> = {}) {
  return {
    type: "expense",
    occurredOn: "2026-11-10",
    categoryId: CATEGORY,
    accountId: cashId,
    currency: "ARS",
    amountMinor: 100_00,
    ...changes,
  };
}

beforeEach(async () => {
  const store = inMemoryAccounts();
  const cash = await store.repository.create("alice", {
    type: "cash",
    institutionId: null,
    name: "Cash",
    closingDay: null,
    dueDay: null,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
  });
  cashId = cash.id;
  app = createApp({
    readVersion: () => "test",
    authHandler: async () => new Response("auth"),
    resolveSession: async (headers) => headers.get("x-user") ?? null,
    users: { findById: async () => null, updateLocale: async () => null },
    accounts: {
      accounts: store.repository,
      everyAccount: store.repository,
      institutions: inMemoryInstitutions([]),
    },
    people: store.repository,
    categories: {
      findCategory: async (_userId: string, id: string) => (id === CATEGORY ? category : null),
    } as CategoryRepository,
    movements: inMemoryMovements().repository,
  });
});

describe("movement routes", () => {
  it("requires a session on every route", async () => {
    // Arrange
    const id = "00000000-0000-4000-8000-000000000001";

    // Act
    const responses = await Promise.all([
      call("GET", "/movements", null),
      call("GET", "/movements/summary?month=2026-11", null),
      call("POST", "/movements", null, expense()),
      call("GET", `/movements/${id}`, null),
      call("PUT", `/movements/${id}`, null, expense()),
      call("DELETE", `/movements/${id}`, null),
    ]);

    // Assert
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401, 401, 401]);
  });

  it("creates, reads, edits, lists and deletes a movement", async () => {
    // Arrange
    const created = await call("POST", "/movements", "alice", expense());
    const { id } = (await created.json()) as { id: string };

    // Act
    const read = await call("GET", `/movements/${id}`, "alice");
    const edited = await call("PUT", `/movements/${id}`, "alice", expense({ amountMinor: 200_00 }));
    const listed = await call("GET", "/movements?limit=10", "alice");
    const summary = await call("GET", "/movements/summary?month=2026-11", "alice");
    const removed = await call("DELETE", `/movements/${id}`, "alice");

    // Assert
    expect(created.status).toBe(201);
    expect(read.status).toBe(200);
    expect(await edited.json()).toMatchObject({ account: { amountMinor: 200_00 } });
    expect(await listed.json()).toMatchObject({ hasMore: false });
    expect(await summary.json()).toMatchObject({ month: "2026-11" });
    expect(removed.status).toBe(204);
  });

  it("answers 400 with a reason for a business violation", async () => {
    // Arrange
    const body = expense({ installments: 3 });

    // Act
    const response = await call("POST", "/movements", "alice", body);

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_request",
      reason: "installments_not_allowed",
    });
  });

  it.each([
    ["an invalid body", () => call("POST", "/movements", "alice", { type: "gift" })],
    [
      "a body that is not JSON",
      () =>
        app.request("/api/movements", {
          method: "POST",
          headers: { "x-user": "alice" },
          body: "x",
        }),
    ],
    [
      "an invalid edit body",
      () => call("PUT", "/movements/00000000-0000-4000-8000-000000000001", "alice", {}),
    ],
    ["an invalid list query", () => call("GET", "/movements?limit=0", "alice")],
    ["an invalid summary month", () => call("GET", "/movements/summary?month=nope", "alice")],
  ])("answers 400 for %s", async (_label, request) => {
    // Arrange
    const send = request;

    // Act
    const response = await send();

    // Assert
    expect(response.status).toBe(400);
  });

  it.each([
    ["GET", "/movements/not-a-uuid"],
    ["PUT", "/movements/not-a-uuid"],
    ["DELETE", "/movements/not-a-uuid"],
    ["GET", "/movements/00000000-0000-4000-8000-000000000001"],
    ["DELETE", "/movements/00000000-0000-4000-8000-000000000001"],
  ])("answers 404 for %s %s", async (method, path) => {
    // Arrange
    const body = method === "PUT" ? expense() : undefined;

    // Act
    const response = await call(method, path, "alice", body);

    // Assert
    expect(response.status).toBe(404);
  });

  it("does not show another user's movement", async () => {
    // Arrange
    const created = await call("POST", "/movements", "alice", expense());
    const { id } = (await created.json()) as { id: string };

    // Act
    const response = await call("GET", `/movements/${id}`, "bob");

    // Assert
    expect(response.status).toBe(404);
  });

  it("answers 409 when the repository reports a movement in use", async () => {
    // Arrange
    const blocked = inMemoryMovements().repository;
    const guarded = createApp({
      readVersion: () => "test",
      authHandler: async () => new Response("auth"),
      resolveSession: async () => "alice",
      users: { findById: async () => null, updateLocale: async () => null },
      accounts: {
        accounts: inMemoryAccounts().repository,
        everyAccount: inMemoryAccounts().repository,
        institutions: inMemoryInstitutions([]),
      },
      people: inMemoryAccounts().repository,
      categories: {} as CategoryRepository,
      movements: { ...blocked, remove: async () => "in_use" },
    });

    // Act
    const response = await guarded.request("/api/movements/00000000-0000-4000-8000-000000000001", {
      method: "DELETE",
    });

    // Assert
    expect(response.status).toBe(409);
  });
});
