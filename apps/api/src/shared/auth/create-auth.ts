import {
  authAccount,
  type Database,
  eq,
  seedUserDefaults,
  session,
  user,
  verification,
} from "@miplata/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Env } from "../env/env";

export type SeedDefaults = (db: Database, userId: string) => Promise<void>;

type CreateAuthOptions = {
  db: Database;
  env: Env;
  seedDefaults?: SeedDefaults;
};

export function createAuth({ db, env, seedDefaults = seedUserDefaults }: CreateAuthOptions) {
  const secure = new URL(env.BETTER_AUTH_URL).protocol === "https:";
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, auth_account: authAccount, verification },
    }),
    account: { modelName: "auth_account" },
    socialProviders: {
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
    },
    user: {
      additionalFields: {
        locale: { type: "string", required: false, defaultValue: "es", input: false },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: secure,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (created) => {
            try {
              await seedDefaults(db, created.id);
            } catch (error) {
              await db.delete(user).where(eq(user.id, created.id));
              throw error;
            }
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
