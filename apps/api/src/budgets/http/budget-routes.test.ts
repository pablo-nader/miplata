import type { CategoryDto } from "@miplata/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { unusedAccountDependencies } from "../../test/account-fakes";
import { inMemoryBudgets } from "../../test/budget-fakes";

const CATEGORY = "00000000-0000-4000-8000-000000000009";
const MISSING = "00000000-0000-4000-8000-0000000000aa";

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

const request = { categoryId: CATEGORY, currency: "ARS", limitMinor: 10000 };

beforeEach(() => {
  app = createApp({
    readVersion: () => "test",
    authHandler: async () => new Response("auth"),
    resolveSession: async (headers) => headers.get("x-user") ?? null,
    users: { findById: async () => null, updateLocale: async () => null },
    categories: {
      findCategory: async (_userId: string, id: string) => (id === CATEGORY ? category : null),
      findGroup: async () => null,
      listCategories: async () => [category],
    } as unknown as CategoryRepository,
    ...unusedAccountDependencies(),
    budgets: inMemoryBudgets().repository,
  });
});

describe("budget routes", () => {
  it("requires a session on every route", async () => {
    // Arrange
    const id = "00000000-0000-4000-8000-000000000001";

    // Act
    const responses = await Promise.all([
      call("GET", "/budgets?month=2026-11", null),
      call("POST", "/budgets", null, request),
      call("PUT", `/budgets/${id}`, null, request),
      call("DELETE", `/budgets/${id}`, null),
    ]);

    // Assert
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401]);
  });

  it("creates, lists with progress, edits and deletes a budget", async () => {
    // Arrange
    const created = await call("POST", "/budgets", "alice", request);
    const { id } = (await created.json()) as { id: string };

    // Act
    const listed = await call("GET", "/budgets?month=2026-11", "alice");
    const edited = await call("PUT", `/budgets/${id}`, "alice", { ...request, limitMinor: 20000 });
    const removed = await call("DELETE", `/budgets/${id}`, "alice");

    // Assert
    expect(created.status).toBe(201);
    expect(await listed.json()).toMatchObject({
      month: "2026-11",
      items: [{ spentMinor: 0, remainingMinor: 10000, state: "below" }],
    });
    expect(await edited.json()).toMatchObject({ limitMinor: 20000 });
    expect(removed.status).toBe(204);
  });

  it("answers 400 for a bad body, an unknown category and a bad month", async () => {
    // Arrange
    const bad = { ...request, limitMinor: 0 };

    // Act
    const body = await call("POST", "/budgets", "alice", bad);
    const unknown = await call("POST", "/budgets", "alice", { ...request, categoryId: MISSING });
    const month = await call("GET", "/budgets?month=2026-13", "alice");

    // Assert
    expect(body.status).toBe(400);
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({
      error: "invalid_request",
      reason: "category_not_found",
    });
    expect(month.status).toBe(400);
  });

  it("answers 409 for a duplicate and 404 for malformed or unknown ids", async () => {
    // Arrange
    await call("POST", "/budgets", "alice", request);

    // Act
    const duplicate = await call("POST", "/budgets", "alice", request);
    const malformed = await call("DELETE", "/budgets/not-an-id", "alice");
    const unknown = await call("PUT", `/budgets/${MISSING}`, "alice", request);

    // Assert
    expect(duplicate.status).toBe(409);
    expect(malformed.status).toBe(404);
    expect(unknown.status).toBe(404);
  });

  it("never shows or changes the budgets of another user", async () => {
    // Arrange
    const created = await call("POST", "/budgets", "alice", request);
    const { id } = (await created.json()) as { id: string };

    // Act
    const listed = await call("GET", "/budgets?month=2026-11", "bob");
    const edited = await call("PUT", `/budgets/${id}`, "bob", request);
    const removed = await call("DELETE", `/budgets/${id}`, "bob");

    // Assert
    expect(await listed.json()).toEqual({ month: "2026-11", items: [] });
    expect(edited.status).toBe(404);
    expect(removed.status).toBe(404);
  });
});
