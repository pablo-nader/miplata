import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INSTITUTION_CATALOG } from "../seed";
import { createTestDatabase } from "../test/test-database";

type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>;

let database: TestDatabase;

beforeAll(async () => {
  database = await createTestDatabase();
});

afterAll(() => database.close());

describe("migrations applied to an empty database", () => {
  it("create every table", async () => {
    // Arrange
    const expected = [
      "account",
      "account_currency",
      "auth_account",
      "budget",
      "category",
      "category_group",
      "installment",
      "institution",
      "movement",
      "posting",
      "recurring",
      "recurring_occurrence",
      "session",
      "statement",
      "user",
      "verification",
    ];

    // Act
    const result = await database.pool.query(
      "select table_name from information_schema.tables where table_schema = 'public' and table_name <> '__drizzle_migrations' order by table_name",
    );

    // Assert
    expect(result.rows.map((row) => row.table_name)).toEqual(expected);
  });

  it("enable pg_trgm, unaccent and the accent-insensitive trigram index on movement.description", async () => {
    // Arrange
    const query = `select
      (select count(*) from pg_extension where extname in ('pg_trgm', 'unaccent')) as extension,
      (select indexdef from pg_indexes where indexname = 'movement_description_search_idx') as index`;

    // Act
    const result = await database.pool.query(query);

    // Assert
    expect(result.rows[0].extension).toBe("2");
    expect(result.rows[0].index).toContain("immutable_unaccent");
    expect(result.rows[0].index).toContain("gin_trgm_ops");
  });

  it("create the indexes listed in the data model", async () => {
    // Arrange
    const names = [
      "posting_user_account_currency_idx",
      "installment_user_period_idx",
      "installment_user_statement_idx",
      "movement_user_occurred_on_idx",
    ];

    // Act
    const result = await database.pool.query(
      "select indexname, indexdef from pg_indexes where indexname = any($1) order by indexname",
      [names],
    );

    // Assert
    expect(result.rows.map((row) => row.indexname)).toEqual([...names].sort());
    expect(
      result.rows.find((row) => row.indexname === "movement_user_occurred_on_idx").indexdef,
    ).toContain("occurred_on DESC");
  });

  it("load the global institution catalog", async () => {
    // Arrange
    const expected = INSTITUTION_CATALOG.map((item) => `${item.kind}:${item.name}`).sort();

    // Act
    const result = await database.pool.query("select kind, name from institution");

    // Assert
    expect(result.rows.map((row) => `${row.kind}:${row.name}`).sort()).toEqual(expected);
  });

  it("set the catalog logo paths and keep them when the update runs again", async () => {
    // Arrange
    const expected = INSTITUTION_CATALOG.map(
      (item) => `${item.name}:${item.logoPath ?? ""}`,
    ).sort();
    const sql = readFileSync(
      join(import.meta.dirname, "../../drizzle/0001_institution_logos.sql"),
      "utf8",
    );

    // Act
    await database.pool.query(sql);
    const result = await database.pool.query(
      "select name, coalesce(logo_path, '') as logo_path from institution",
    );

    // Assert
    expect(result.rows.map((row) => `${row.name}:${row.logo_path}`).sort()).toEqual(expected);
  });

  it("make the user locale default to es", async () => {
    // Arrange
    const userId = await database.insertUser();

    // Act
    const result = await database.pool.query('select locale from "user" where id = $1', [userId]);

    // Assert
    expect(result.rows[0].locale).toBe("es");
  });

  it("make every user-owned table carry user_id", async () => {
    // Arrange
    const owned = [
      "category_group",
      "category",
      "account",
      "account_currency",
      "movement",
      "posting",
      "installment",
      "statement",
      "recurring",
      "recurring_occurrence",
      "budget",
    ];

    // Act
    const result = await database.pool.query(
      "select table_name from information_schema.columns where table_schema = 'public' and column_name = 'user_id' and table_name = any($1) order by table_name",
      [owned],
    );

    // Assert
    expect(result.rows.map((row) => row.table_name)).toEqual([...owned].sort());
  });
});
