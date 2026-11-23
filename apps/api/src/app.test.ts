import { describe, expect, it } from "vitest";
import { type AppDependencies, createApp } from "./app";
import type { CategoryRepository } from "./categories/application/category-repository";

const unusedCategories = new Proxy({} as CategoryRepository, {
  get: () => async () => {
    throw new Error("unused");
  },
});

import { unusedAccountDependencies } from "./test/account-fakes";

function buildApp(overrides: Partial<AppDependencies> = {}) {
  return createApp({
    readVersion: () => "1.2.3",
    authHandler: async () => new Response("auth", { status: 200 }),
    resolveSession: async () => null,
    users: { findById: async () => null, updateLocale: async () => null },
    categories: unusedCategories,
    ...unusedAccountDependencies(),
    ...overrides,
  });
}

describe("GET /api/health", () => {
  it("returns status and version", async () => {
    // Arrange
    const app = buildApp();

    // Act
    const response = await app.request("/api/health");

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", version: "1.2.3" });
  });

  it("returns not found for unknown api paths", async () => {
    // Arrange
    const app = buildApp();

    // Act
    const response = await app.request("/api/unknown");

    // Assert
    expect(response.status).toBe(404);
  });
});

describe("/api/auth", () => {
  it("delegates to the auth handler", async () => {
    // Arrange
    const app = buildApp();

    // Act
    const response = await app.request("/api/auth/get-session");

    // Assert
    expect(await response.text()).toBe("auth");
  });
});

describe("/api/me", () => {
  it("requires a session", async () => {
    // Arrange
    const app = buildApp();

    // Act
    const response = await app.request("/api/me");

    // Assert
    expect(response.status).toBe(401);
  });

  it("answers 401 when the session user no longer exists", async () => {
    // Arrange
    const app = buildApp({ resolveSession: async () => "ghost" });

    // Act
    const get = await app.request("/api/me");
    const patch = await app.request("/api/me/locale", {
      method: "PATCH",
      body: JSON.stringify({ locale: "en" }),
    });

    // Assert
    expect(get.status).toBe(401);
    expect(patch.status).toBe(401);
  });
});
