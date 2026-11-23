import type { CategoryDto, CategoryGroupDto } from "@miplata/shared";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../../app";
import { unusedAccountDependencies } from "../../test/account-fakes";
import type { CategoryRepository } from "../application/category-repository";

const id = "6f1c1b1e-0000-4000-8000-000000000001";
const group: CategoryGroupDto = { id, nameKey: null, name: "Home", sortOrder: 0 };
const row: CategoryDto = {
  id,
  type: "expense",
  groupId: id,
  nameKey: null,
  name: "Rent",
  icon: "key",
  color: 1,
  isActive: true,
  sortOrder: 0,
};

function appWith(overrides: Partial<CategoryRepository> = {}, userId: string | null = "u1") {
  const categories: CategoryRepository = {
    listGroups: vi.fn(async () => [group]),
    listCategories: vi.fn(async () => [row]),
    findCategory: vi.fn(async () => row),
    findGroup: vi.fn(async () => group),
    insertCategory: vi.fn(async () => row),
    updateCategory: vi.fn(async () => row),
    setActive: vi.fn(async () => row),
    deleteCategory: vi.fn(async () => "deleted" as const),
    insertGroup: vi.fn(async () => group),
    renameGroup: vi.fn(async () => group),
    deleteGroup: vi.fn(async () => "deleted" as const),
    mostUsedCategoryIds: vi.fn(async () => []),
    ...overrides,
  };
  const app = createApp({
    readVersion: () => "t",
    authHandler: async () => new Response("auth"),
    resolveSession: async () => userId,
    users: { findById: async () => null, updateLocale: async () => null },
    categories,
    ...unusedAccountDependencies(),
  });
  return { app, categories };
}

function send(
  app: ReturnType<typeof appWith>["app"],
  method: string,
  path: string,
  body?: unknown,
) {
  return app.request(`/api${path}`, {
    method,
    headers: { "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const newCategory = { type: "expense", groupId: id, name: "Rent", icon: "key", color: 1 };

describe("authentication", () => {
  it.each([
    ["GET", "/categories"],
    ["GET", "/categories/most-used?type=expense"],
    ["POST", "/categories"],
    ["PATCH", `/categories/${id}`],
    ["POST", `/categories/${id}/deactivate`],
    ["POST", `/categories/${id}/reactivate`],
    ["DELETE", `/categories/${id}`],
    ["POST", "/category-groups"],
    ["PATCH", `/category-groups/${id}`],
    ["DELETE", `/category-groups/${id}`],
  ])("%s %s answers 401 without a session", async (method, path) => {
    // Arrange
    const { app } = appWith({}, null);

    // Act
    const response = await send(app, method, path, method === "GET" ? undefined : {});

    // Assert
    expect(response.status).toBe(401);
  });
});

describe("categories", () => {
  it("lists the catalog of the session user", async () => {
    // Arrange
    const { app, categories } = appWith();

    // Act
    const response = await send(app, "GET", "/categories");

    // Assert
    expect(response.status).toBe(200);
    const catalog = (await response.json()) as { expenseGroups: { categories: unknown[] }[] };
    expect(catalog.expenseGroups[0]?.categories).toHaveLength(1);
    expect(categories.listCategories).toHaveBeenCalledWith("u1");
  });

  it("asks for the session user's most used categories of the last 90 days", async () => {
    // Arrange
    const { app, categories } = appWith({ mostUsedCategoryIds: vi.fn(async () => [id]) });

    // Act
    const response = await send(app, "GET", "/categories/most-used?type=income&userId=spoofed");

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ categoryIds: [id] });
    expect(categories.mostUsedCategoryIds).toHaveBeenCalledWith("u1", "income", "2026-08-25", 4);
  });

  it.each(["", "?type=other"])("rejects most used with type %s with 400", async (query) => {
    // Arrange
    const { app } = appWith();

    // Act
    const response = await send(app, "GET", `/categories/most-used${query}`);

    // Assert
    expect(response.status).toBe(400);
  });

  it("never takes the user id from the request", async () => {
    // Arrange
    const { app, categories } = appWith();

    // Act
    await app.request("/api/categories?userId=spoofed", { headers: { "x-user-id": "spoofed" } });
    await send(app, "POST", "/categories", { ...newCategory, userId: "spoofed" });

    // Assert
    expect(categories.listCategories).toHaveBeenCalledWith("u1");
    expect(categories.insertCategory).toHaveBeenCalledWith("u1", expect.any(Object));
  });

  it("creates a category with 201", async () => {
    // Arrange
    const { app } = appWith();

    // Act
    const response = await send(app, "POST", "/categories", newCategory);

    // Assert
    expect(response.status).toBe(201);
  });

  it.each([
    ["malformed json", undefined],
    ["an icon outside the curated set", { ...newCategory, icon: "skull" }],
    ["a missing group for an expense", { ...newCategory, groupId: undefined }],
    ["a group for an income", { ...newCategory, type: "income" }],
  ])("rejects %s with 400", async (_label, body) => {
    // Arrange
    const { app } = appWith();

    // Act
    const response = await send(app, "POST", "/categories", body);

    // Assert
    expect(response.status).toBe(400);
  });

  it("answers 400 when the group does not exist and 409 when the name is taken", async () => {
    // Arrange
    const missing = appWith({ findGroup: vi.fn(async () => null) });
    const taken = appWith({ insertCategory: vi.fn(async () => "name_taken" as const) });

    // Act
    const first = await send(missing.app, "POST", "/categories", newCategory);
    const second = await send(taken.app, "POST", "/categories", newCategory);

    // Assert
    expect(first.status).toBe(400);
    expect(second.status).toBe(409);
    expect(await second.json()).toEqual({ error: "name_taken" });
  });

  it("updates a category", async () => {
    // Arrange
    const { app } = appWith();

    // Act
    const response = await send(app, "PATCH", `/categories/${id}`, { color: 3 });

    // Assert
    expect(response.status).toBe(200);
  });

  it("maps update failures to 400, 404 and 409", async () => {
    // Arrange
    const empty = appWith();
    const missing = appWith({ findCategory: vi.fn(async () => null) });
    const taken = appWith({ updateCategory: vi.fn(async () => "name_taken" as const) });
    const income = appWith({
      findCategory: vi.fn(async () => ({ ...row, type: "income" as const })),
    });

    // Act
    const statuses = [
      (await send(empty.app, "PATCH", `/categories/${id}`, {})).status,
      (await send(missing.app, "PATCH", `/categories/${id}`, { color: 2 })).status,
      (await send(taken.app, "PATCH", `/categories/${id}`, { name: "Dup" })).status,
      (await send(income.app, "PATCH", `/categories/${id}`, { groupId: id })).status,
    ];

    // Assert
    expect(statuses).toEqual([400, 404, 409, 400]);
  });

  it("deactivates and reactivates, answering 404 for a missing category", async () => {
    // Arrange
    const { app } = appWith();
    const missing = appWith({ setActive: vi.fn(async () => null) });

    // Act
    const off = await send(app, "POST", `/categories/${id}/deactivate`);
    const on = await send(app, "POST", `/categories/${id}/reactivate`);
    const absent = await send(missing.app, "POST", `/categories/${id}/deactivate`);

    // Assert
    expect([off.status, on.status, absent.status]).toEqual([200, 200, 404]);
  });

  it("deletes with 204, refuses a used category with 409 and answers 404 when missing", async () => {
    // Arrange
    const ok = appWith();
    const used = appWith({ deleteCategory: vi.fn(async () => "in_use" as const) });
    const missing = appWith({ deleteCategory: vi.fn(async () => "not_found" as const) });

    // Act
    const deleted = await send(ok.app, "DELETE", `/categories/${id}`);
    const refused = await send(used.app, "DELETE", `/categories/${id}`);
    const absent = await send(missing.app, "DELETE", `/categories/${id}`);

    // Assert
    expect([deleted.status, refused.status, absent.status]).toEqual([204, 409, 404]);
    expect(await refused.json()).toEqual({ error: "category_in_use" });
  });

  it.each([
    ["PATCH", { color: 2 }, ""],
    ["POST", undefined, "/deactivate"],
    ["POST", undefined, "/reactivate"],
    ["DELETE", undefined, ""],
  ])("answers 404 for an id that is not a uuid (%s%s)", async (method, body, suffix) => {
    // Arrange
    const { app, categories } = appWith();

    // Act
    const response = await send(app, method, `/categories/not-a-uuid${suffix}`, body);

    // Assert
    expect(response.status).toBe(404);
    expect(categories.findCategory).not.toHaveBeenCalled();
    expect(categories.deleteCategory).not.toHaveBeenCalled();
    expect(categories.setActive).not.toHaveBeenCalled();
  });
});

describe("category groups", () => {
  it("creates a group with 201, rejects bad input and reports a taken name", async () => {
    // Arrange
    const { app } = appWith();
    const taken = appWith({ insertGroup: vi.fn(async () => "name_taken" as const) });

    // Act
    const created = await send(app, "POST", "/category-groups", { name: "Pets" });
    const invalid = await send(app, "POST", "/category-groups", { name: " " });
    const conflict = await send(taken.app, "POST", "/category-groups", { name: "Pets" });

    // Assert
    expect([created.status, invalid.status, conflict.status]).toEqual([201, 400, 409]);
  });

  it("renames with 200 and maps 400, 404 and 409", async () => {
    // Arrange
    const { app } = appWith();
    const missing = appWith({ renameGroup: vi.fn(async () => null) });
    const taken = appWith({ renameGroup: vi.fn(async () => "name_taken" as const) });

    // Act
    const statuses = [
      (await send(app, "PATCH", `/category-groups/${id}`, { name: "House" })).status,
      (await send(app, "PATCH", `/category-groups/${id}`, {})).status,
      (await send(missing.app, "PATCH", `/category-groups/${id}`, { name: "House" })).status,
      (await send(taken.app, "PATCH", `/category-groups/${id}`, { name: "House" })).status,
      (await send(app, "PATCH", "/category-groups/nope", { name: "House" })).status,
    ];

    // Assert
    expect(statuses).toEqual([200, 400, 404, 409, 404]);
  });

  it("deletes with 204, refuses a group with categories with 409 and answers 404 when missing", async () => {
    // Arrange
    const { app } = appWith();
    const full = appWith({ deleteGroup: vi.fn(async () => "not_empty" as const) });
    const missing = appWith({ deleteGroup: vi.fn(async () => "not_found" as const) });

    // Act
    const statuses = [
      (await send(app, "DELETE", `/category-groups/${id}`)).status,
      (await send(full.app, "DELETE", `/category-groups/${id}`)).status,
      (await send(missing.app, "DELETE", `/category-groups/${id}`)).status,
      (await send(app, "DELETE", "/category-groups/nope")).status,
    ];

    // Assert
    expect(statuses).toEqual([204, 409, 404, 404]);
  });
});
