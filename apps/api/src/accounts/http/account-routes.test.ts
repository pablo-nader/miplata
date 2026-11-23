import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { inMemoryAccounts, inMemoryInstitutions } from "../../test/account-fakes";
import { inMemoryMovements } from "../../test/movement-fakes";
import { emptyReports } from "../../test/report-fakes";

const unusedCategories = new Proxy({} as CategoryRepository, {
  get: () => async () => {
    throw new Error("unused");
  },
});

function buildApp() {
  const store = inMemoryAccounts();
  const people = inMemoryAccounts();
  const institutions = inMemoryInstitutions([
    { id: "00000000-0000-4000-8000-0000000000a1", kind: "bank", name: "Galicia", logoPath: null },
  ]);
  const app = createApp({
    readVersion: () => "test",
    authHandler: async () => new Response("auth"),
    resolveSession: async (headers) => headers.get("x-user") ?? null,
    users: { findById: async () => null, updateLocale: async () => null },
    accounts: { accounts: store.repository, everyAccount: store.repository, institutions },
    people: people.repository,
    categories: unusedCategories,
    movements: inMemoryMovements().repository,
    reports: emptyReports(),
  });
  return { app, store };
}

function call(
  app: ReturnType<typeof buildApp>["app"],
  method: string,
  path: string,
  user: string | null,
  body?: unknown,
) {
  return app.request(`/api${path}`, {
    method,
    headers: {
      ...(user ? { "x-user": user } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const cash = {
  type: "cash",
  name: "Pocket",
  currencies: [{ currency: "ARS", openingBalanceMinor: 1_000 }],
};

describe("account routes", () => {
  it("rejects every endpoint without a session", async () => {
    // Arrange
    const { app } = buildApp();
    const paths = ["/accounts", "/people", "/institutions", "/balance"];

    // Act
    const responses = await Promise.all(paths.map((path) => call(app, "GET", path, null)));

    // Assert
    expect(responses.map((response) => response.status)).toEqual([401, 401, 401, 401]);
  });

  it("creates, reads, updates, deactivates, reactivates and deletes an account", async () => {
    // Arrange
    const { app } = buildApp();
    const created = await call(app, "POST", "/accounts", "a", cash);
    const { id } = (await created.json()) as { id: string };
    const path = `/accounts/${id}`;

    // Act
    const read = await call(app, "GET", path, "a");
    const patched = await call(app, "PATCH", path, "a", { name: "Pouch" });
    const off = await call(app, "POST", `${path}/deactivate`, "a");
    const on = await call(app, "POST", `${path}/reactivate`, "a");
    const removed = await call(app, "DELETE", path, "a");

    // Assert
    expect(created.status).toBe(201);
    expect(read.status).toBe(200);
    expect(await patched.json()).toMatchObject({ name: "Pouch" });
    expect(await off.json()).toMatchObject({ isActive: false });
    expect(await on.json()).toMatchObject({ isActive: true });
    expect(removed.status).toBe(204);
    expect((await call(app, "GET", path, "a")).status).toBe(404);
  });

  it("answers 409 when deleting an account that has postings", async () => {
    // Arrange
    const { app, store } = buildApp();
    const created = await call(app, "POST", "/accounts", "a", cash);
    const { id } = (await created.json()) as { id: string };
    store.post(id, "ARS", -10);

    // Act
    const response = await call(app, "DELETE", `/accounts/${id}`, "a");

    // Assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "account_in_use" });
  });

  it("does not expose one user's accounts to another", async () => {
    // Arrange
    const { app } = buildApp();
    const created = await call(app, "POST", "/accounts", "a", cash);
    const { id } = (await created.json()) as { id: string };
    const path = `/accounts/${id}`;

    // Act
    const responses = await Promise.all([
      call(app, "GET", path, "b"),
      call(app, "PATCH", path, "b", { name: "Mine" }),
      call(app, "POST", `${path}/deactivate`, "b"),
      call(app, "POST", `${path}/reactivate`, "b"),
      call(app, "DELETE", path, "b"),
    ]);
    const listForB = await call(app, "GET", "/accounts", "b");

    // Assert
    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 404]);
    expect(await listForB.json()).toEqual([]);
    expect((await call(app, "GET", path, "a")).status).toBe(200);
  });

  it("answers 404 for malformed ids and 400 for invalid bodies", async () => {
    // Arrange
    const { app } = buildApp();

    // Act
    const responses = await Promise.all([
      call(app, "GET", "/accounts/nope", "a"),
      call(app, "PATCH", "/accounts/nope", "a", {}),
      call(app, "POST", "/accounts/nope/deactivate", "a"),
      call(app, "DELETE", "/accounts/nope", "a"),
      call(app, "POST", "/accounts", "a", { type: "nope" }),
      call(app, "PATCH", "/accounts/00000000-0000-4000-8000-000000000001", "a", { name: "" }),
    ]);

    // Assert
    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 400, 400]);
  });

  it("maps domain violations to 400 with a reason", async () => {
    // Arrange
    const { app } = buildApp();

    // Act
    const response = await call(app, "POST", "/accounts", "a", { ...cash, name: undefined });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_request", reason: "name_required" });
  });

  it("lists the institution catalog and the balance", async () => {
    // Arrange
    const { app } = buildApp();
    await call(app, "POST", "/accounts", "a", cash);

    // Act
    const institutions = await call(app, "GET", "/institutions", "a");
    const balance = await call(app, "GET", "/balance", "a");

    // Assert
    expect(await institutions.json()).toMatchObject([{ name: "Galicia" }]);
    expect(await balance.json()).toMatchObject({
      totals: [
        { currency: "ARS", totalMinor: 1_000 },
        { currency: "USD", totalMinor: 0 },
      ],
    });
  });
});

describe("people routes", () => {
  const person = { name: "Juan", currencies: [{ currency: "ARS", openingBalanceMinor: 0 }] };

  it("creates, reads, updates, deactivates, reactivates and deletes a person", async () => {
    // Arrange
    const { app } = buildApp();
    const created = await call(app, "POST", "/people", "a", person);
    const { id } = (await created.json()) as { id: string };
    const path = `/people/${id}`;

    // Act
    const list = await call(app, "GET", "/people", "a");
    const read = await call(app, "GET", path, "a");
    const patched = await call(app, "PATCH", path, "a", { name: "Juan P." });
    const off = await call(app, "POST", `${path}/deactivate`, "a");
    const on = await call(app, "POST", `${path}/reactivate`, "a");
    const removed = await call(app, "DELETE", path, "a");

    // Assert
    expect(created.status).toBe(201);
    expect(await list.json()).toHaveLength(1);
    expect(read.status).toBe(200);
    expect(await patched.json()).toMatchObject({ name: "Juan P." });
    expect(await off.json()).toMatchObject({ isActive: false });
    expect(await on.json()).toMatchObject({ isActive: true });
    expect(removed.status).toBe(204);
  });

  it("isolates people between users and validates input", async () => {
    // Arrange
    const { app } = buildApp();
    const created = await call(app, "POST", "/people", "a", person);
    const { id } = (await created.json()) as { id: string };
    const path = `/people/${id}`;

    // Act
    const responses = await Promise.all([
      call(app, "GET", path, "b"),
      call(app, "PATCH", path, "b", { name: "x" }),
      call(app, "POST", `${path}/deactivate`, "b"),
      call(app, "DELETE", path, "b"),
      call(app, "GET", "/people/nope", "a"),
      call(app, "PATCH", "/people/nope", "a", {}),
      call(app, "DELETE", "/people/nope", "a"),
      call(app, "POST", "/people", "a", { currencies: [] }),
      call(app, "PATCH", path, "a", { name: "" }),
    ]);

    // Assert
    expect(responses.map((response) => response.status)).toEqual([
      404, 404, 404, 404, 404, 404, 404, 400, 400,
    ]);
  });

  it("answers 404 when deleting the same person twice", async () => {
    // Arrange
    const { app } = buildApp();
    const created = await call(app, "POST", "/people", "a", person);
    const { id } = (await created.json()) as { id: string };

    // Act
    const response = await call(app, "DELETE", `/people/${id}`, "a");
    const second = await call(app, "DELETE", `/people/${id}`, "a");

    // Assert
    expect(response.status).toBe(204);
    expect(second.status).toBe(404);
  });
});
