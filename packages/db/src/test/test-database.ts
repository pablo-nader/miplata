import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { createDb } from "../client";
import * as schema from "../schema";

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

function withDatabase(connectionString: string, database: string) {
  const url = new URL(connectionString);
  url.pathname = `/${database}`;
  return url.toString();
}

async function dropWithRetry(admin: Pool, name: string) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await admin.query(`drop database "${name}"`);
      return;
    } catch (error) {
      if (attempt >= 20) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export async function createTestDatabase() {
  const adminUrl = process.env.DATABASE_URL ?? "";
  const name = `miplata_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: adminUrl });
  await admin.query(`create database "${name}"`);
  const client = createDb(withDatabase(adminUrl, name));
  await migrate(client.db, { migrationsFolder });
  const pool = new Pool({ connectionString: withDatabase(adminUrl, name) });

  async function insertUser(email = `${randomUUID()}@example.com`) {
    const [row] = await client.db
      .insert(schema.user)
      .values({ name: "Test User", email })
      .returning({ id: schema.user.id });
    return (row as { id: string }).id;
  }

  async function close() {
    await client.close();
    await pool.end();
    await dropWithRetry(admin, name);
    await admin.end();
  }

  return { ...client, pool, insertUser, close };
}
