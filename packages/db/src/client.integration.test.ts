import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { createDb } from "./client";

const client = createDb(process.env.DATABASE_URL ?? "");

afterAll(() => client.close());

describe("database connection", () => {
  it("runs a query against a real Postgres", async () => {
    // Arrange
    const query = sql`select 1 as one`;

    // Act
    const result = await client.db.execute(query);

    // Assert
    expect(result.rows[0]).toEqual({ one: 1 });
  });
});
