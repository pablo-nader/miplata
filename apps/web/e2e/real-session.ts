import { createHmac, randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import pg from "pg";
import { markToursSeen } from "./tours-seen";

const secret = "e2e-only-secret-that-is-at-least-32-characters";
const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://miplata:miplata@localhost:5432/miplata_test";

export async function signInAsNewUser(
  context: BrowserContext,
  options: { freshTours?: boolean } = {},
) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const created = await client.query(
      'insert into "user" (name, email, email_verified) values ($1, $2, true) returning id',
      ["E2E Person", `${randomUUID()}@example.com`],
    );
    const userId = created.rows[0].id as string;
    if (!options.freshTours) {
      await markToursSeen(context, userId);
    }
    const token = randomUUID().replaceAll("-", "");
    await client.query(
      "insert into session (expires_at, token, user_id) values (now() + interval '1 day', $1, $2)",
      [token, userId],
    );
    const signature = createHmac("sha256", secret).update(token).digest("base64");
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: encodeURIComponent(`${token}.${signature}`),
        domain: "localhost",
        path: "/",
      },
    ]);
    return userId;
  } finally {
    await client.end();
  }
}

export async function seedFinancialCharges(userId: string) {
  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const group = await client.query(
      "insert into category_group (user_id, name_key, sort_order) values ($1, 'defaults.group.financialCharges', 90) returning id",
      [userId],
    );
    const names = ["defaults.category.interest", "defaults.category.adjustment"];
    for (const [index, nameKey] of names.entries()) {
      await client.query(
        "insert into category (user_id, type, group_id, name_key, color, sort_order) values ($1, 'expense', $2, $3, 3, $4)",
        [userId, group.rows[0].id, nameKey, index],
      );
    }
  } finally {
    await client.end();
  }
}
