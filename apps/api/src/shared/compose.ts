import { createDb } from "@miplata/db";
import { createApp } from "../app";
import { drizzleUserProfileRepository } from "../me/infrastructure/drizzle-user-profile-repository";
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
  });
}
