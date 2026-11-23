import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("GET /api/health", () => {
  it("returns status and version", async () => {
    // Arrange
    const app = createApp(() => "1.2.3");

    // Act
    const response = await app.request("/api/health");

    // Assert
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", version: "1.2.3" });
  });

  it("returns not found for unknown api paths", async () => {
    // Arrange
    const app = createApp(() => "1.2.3");

    // Act
    const response = await app.request("/api/unknown");

    // Assert
    expect(response.status).toBe(404);
  });
});
