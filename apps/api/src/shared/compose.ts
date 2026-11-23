import { createDb, type Database } from "@miplata/db";
import { ACCOUNT_TYPES, MONEY_ACCOUNT_TYPES } from "@miplata/shared";
import { drizzleAccountRepository } from "../accounts/infrastructure/drizzle-account-repository";
import { drizzleInstitutionRepository } from "../accounts/infrastructure/drizzle-institution-repository";
import { createApp } from "../app";
import { drizzleCategoryRepository } from "../categories/infrastructure/drizzle-category-repository";
import { drizzleUserProfileRepository } from "../me/infrastructure/drizzle-user-profile-repository";
import { drizzleMovementRepository } from "../movements/infrastructure/drizzle-movement-repository";
import { drizzleReportRepository } from "../reports/infrastructure/drizzle-report-repository";
import { readVersion } from "../version";
import { createAuth } from "./auth/create-auth";
import { sessionResolverFor } from "./auth/session-resolver";
import { type Env, parseEnv } from "./env/env";

export function composeApp(env: Env = parseEnv(process.env)) {
  const { db } = createDb(env.DATABASE_URL);
  const auth = createAuth({ db, env });
  return createApp({
    readVersion,
    authHandler: auth.handler,
    resolveSession: sessionResolverFor(auth),
    users: drizzleUserProfileRepository(db),
    categories: drizzleCategoryRepository(db),
    ...accountDependencies(db),
    movements: drizzleMovementRepository(db),
    reports: drizzleReportRepository(db),
  });
}

export function accountDependencies(db: Database) {
  return {
    accounts: {
      accounts: drizzleAccountRepository(db, MONEY_ACCOUNT_TYPES),
      everyAccount: drizzleAccountRepository(db, ACCOUNT_TYPES),
      institutions: drizzleInstitutionRepository(db),
    },
    people: drizzleAccountRepository(db, ["person"]),
  };
}
