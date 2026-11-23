import { createHmac } from "node:crypto";
import type { Database } from "@miplata/db";
import { createTestDatabase } from "@miplata/db/testing";
import { createApp } from "../app";
import { drizzleCategoryRepository } from "../categories/infrastructure/drizzle-category-repository";
import { drizzleUserProfileRepository } from "../me/infrastructure/drizzle-user-profile-repository";
import { createAuth, type SeedDefaults } from "../shared/auth/create-auth";
import { sessionResolverFor } from "../shared/auth/session-resolver";
import { accountDependencies } from "../shared/compose";
import type { Env } from "../shared/env/env";

export const testEnv: Env = {
  DATABASE_URL: "postgres://unused",
  BETTER_AUTH_SECRET: "integration-test-secret-with-at-least-32-chars",
  BETTER_AUTH_URL: "http://localhost:5173",
  GOOGLE_CLIENT_ID: "test-client-id",
  GOOGLE_CLIENT_SECRET: "test-client-secret",
};

const sessionCookieName = "better-auth.session_token";

function signCookie(value: string) {
  const signature = createHmac("sha256", testEnv.BETTER_AUTH_SECRET).update(value).digest("base64");
  return encodeURIComponent(`${value}.${signature}`);
}

export async function createAuthHarness(seedDefaults?: SeedDefaults) {
  const database = await createTestDatabase();
  const db = database.db as Database;
  const auth = createAuth({ db, env: testEnv, ...(seedDefaults ? { seedDefaults } : {}) });
  const app = createApp({
    readVersion: () => "test",
    authHandler: auth.handler,
    resolveSession: sessionResolverFor(auth),
    users: drizzleUserProfileRepository(db),
    categories: drizzleCategoryRepository(db),
    ...accountDependencies(db),
  });

  async function signUpWithGoogle(email: string, name = "Test Person") {
    const context = await auth.$context;
    const created = await context.internalAdapter.createOAuthUser(
      { email, name, emailVerified: true, image: "https://example.com/avatar.png" },
      { providerId: "google", accountId: `google-${email}`, accessToken: "token" },
    );
    return created.user.id;
  }

  async function cookieFor(userId: string) {
    const context = await auth.$context;
    const created = await context.internalAdapter.createSession(userId);
    return `${sessionCookieName}=${signCookie(created.token)}`;
  }

  return { ...database, db, auth, app, signUpWithGoogle, cookieFor };
}
