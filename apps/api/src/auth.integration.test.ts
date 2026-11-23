import {
  account,
  accountCurrency,
  authAccount,
  category,
  categoryGroup,
  eq,
  user,
} from "@miplata/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthHarness } from "./test/auth-harness";

type Harness = Awaited<ReturnType<typeof createAuthHarness>>;

let harness: Harness;

beforeAll(async () => {
  harness = await createAuthHarness();
});

afterAll(async () => {
  await harness.close();
});

function get(path: string, cookie?: string) {
  return harness.app.request(path, cookie ? { headers: { cookie } } : {});
}

function patchLocale(body: unknown, cookie?: string) {
  return harness.app.request("/api/me/locale", {
    method: "PATCH",
    headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe("auth middleware", () => {
  it("rejects requests without a session", async () => {
    // Arrange
    const noCookie = undefined;

    // Act
    const response = await get("/api/me", noCookie);

    // Assert
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("rejects a forged session cookie", async () => {
    // Arrange
    const forged = "better-auth.session_token=forged.value";

    // Act
    const response = await get("/api/me", forged);

    // Assert
    expect(response.status).toBe(401);
  });

  it("ignores a user id sent in the query, header or body", async () => {
    // Arrange
    const owner = await harness.signUpWithGoogle("owner-ignore@example.com", "Owner");
    const other = await harness.signUpWithGoogle("other-ignore@example.com", "Other");
    const cookie = await harness.cookieFor(owner);

    // Act
    const response = await harness.app.request(`/api/me?userId=${other}`, {
      headers: { cookie, "x-user-id": other },
    });
    const body = (await response.json()) as { id: string };

    // Assert
    expect(response.status).toBe(200);
    expect(body.id).toBe(owner);
  });
});

describe("GET /api/me", () => {
  it("returns the signed-in user profile with the default locale", async () => {
    // Arrange
    const userId = await harness.signUpWithGoogle("me@example.com", "Me Person");
    const cookie = await harness.cookieFor(userId);

    // Act
    const response = await get("/api/me", cookie);

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      id: userId,
      name: "Me Person",
      email: "me@example.com",
      image: "https://example.com/avatar.png",
      locale: "es",
    });
  });

  it("never exposes another user's data", async () => {
    // Arrange
    const alice = await harness.signUpWithGoogle("alice@example.com", "Alice");
    const bob = await harness.signUpWithGoogle("bob@example.com", "Bob");
    const aliceCookie = await harness.cookieFor(alice);
    const bobCookie = await harness.cookieFor(bob);

    // Act
    const aliceBody = (await (await get("/api/me", aliceCookie)).json()) as { email: string };
    const bobBody = (await (await get("/api/me", bobCookie)).json()) as { email: string };

    // Assert
    expect(aliceBody.email).toBe("alice@example.com");
    expect(bobBody.email).toBe("bob@example.com");
  });
});

describe("PATCH /api/me/locale", () => {
  it("rejects requests without a session", async () => {
    // Arrange
    const body = { locale: "en" };

    // Act
    const response = await patchLocale(body);

    // Assert
    expect(response.status).toBe(401);
  });

  it("updates only the session user's locale", async () => {
    // Arrange
    const alice = await harness.signUpWithGoogle("alice-locale@example.com");
    const bob = await harness.signUpWithGoogle("bob-locale@example.com");
    const aliceCookie = await harness.cookieFor(alice);

    // Act
    const response = await patchLocale({ locale: "en", userId: bob }, aliceCookie);
    const rows = await harness.db.select({ id: user.id, locale: user.locale }).from(user);
    const locales = new Map(rows.map((row) => [row.id, row.locale]));

    // Assert
    expect(response.status).toBe(200);
    expect(((await response.json()) as { locale: string }).locale).toBe("en");
    expect(locales.get(alice)).toBe("en");
    expect(locales.get(bob)).toBe("es");
  });

  it.each([{ locale: "fr" }, {}, { locale: 3 }])("rejects the invalid body %j", async (body) => {
    // Arrange
    const userId = await harness.signUpWithGoogle(
      `invalid-${JSON.stringify(body).length}@example.com`,
    );
    const cookie = await harness.cookieFor(userId);

    // Act
    const response = await patchLocale(body, cookie);

    // Assert
    expect(response.status).toBe(400);
  });

  it("rejects a body that is not json", async () => {
    // Arrange
    const userId = await harness.signUpWithGoogle("notjson@example.com");
    const cookie = await harness.cookieFor(userId);

    // Act
    const response = await harness.app.request("/api/me/locale", {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: "not json",
    });

    // Assert
    expect(response.status).toBe(400);
  });
});

describe("first sign-in", () => {
  it("creates the default groups, categories and Cash account once", async () => {
    // Arrange
    const email = "first@example.com";

    // Act
    const userId = await harness.signUpWithGoogle(email);
    const groups = await harness.db
      .select()
      .from(categoryGroup)
      .where(eq(categoryGroup.userId, userId));
    const categories = await harness.db.select().from(category).where(eq(category.userId, userId));
    const accounts = await harness.db.select().from(account).where(eq(account.userId, userId));
    const currencies = await harness.db
      .select()
      .from(accountCurrency)
      .where(eq(accountCurrency.userId, userId));

    // Assert
    expect(groups.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);
    expect(accounts).toHaveLength(1);
    expect(accounts[0]?.type).toBe("cash");
    expect(currencies.map((row) => row.currency).sort()).toEqual(["ARS", "USD"]);
  });

  it("stores the Google link in auth_account", async () => {
    // Arrange
    const userId = await harness.signUpWithGoogle("link@example.com");

    // Act
    const links = await harness.db.select().from(authAccount).where(eq(authAccount.userId, userId));

    // Assert
    expect(links).toHaveLength(1);
    expect(links[0]?.providerId).toBe("google");
  });

  it("does not seed again on a later sign-in of the same user", async () => {
    // Arrange
    const userId = await harness.signUpWithGoogle("again@example.com");
    const before = await harness.db.select().from(category).where(eq(category.userId, userId));

    // Act
    await harness.cookieFor(userId);
    const after = await harness.db.select().from(category).where(eq(category.userId, userId));

    // Assert
    expect(after).toHaveLength(before.length);
  });

  it("keeps each user's defaults separate", async () => {
    // Arrange
    const first = await harness.signUpWithGoogle("sep-1@example.com");
    const second = await harness.signUpWithGoogle("sep-2@example.com");

    // Act
    const firstAccounts = await harness.db.select().from(account).where(eq(account.userId, first));
    const secondAccounts = await harness.db
      .select()
      .from(account)
      .where(eq(account.userId, second));

    // Assert
    expect(firstAccounts).toHaveLength(1);
    expect(secondAccounts).toHaveLength(1);
    expect(firstAccounts[0]?.id).not.toBe(secondAccounts[0]?.id);
  });
});
