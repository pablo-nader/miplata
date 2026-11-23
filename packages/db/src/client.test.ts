import { describe, expect, it } from "vitest";
import { createDb } from "./client";

describe("createDb", () => {
  it("builds a client without opening a connection", async () => {
    // Arrange
    const url = "postgres://user:pass@localhost:5432/none";

    // Act
    const client = createDb(url);

    // Assert
    expect(client.db).toBeDefined();
    await client.close();
  });
});
