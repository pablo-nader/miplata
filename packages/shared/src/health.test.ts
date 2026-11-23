import { describe, expect, it } from "vitest";
import { healthResponseSchema } from "./health";

describe("healthResponseSchema", () => {
  it("accepts a healthy response", () => {
    // Arrange
    const payload = { status: "ok", version: "0.1.0" };

    // Act
    const result = healthResponseSchema.safeParse(payload);

    // Assert
    expect(result.success).toBe(true);
  });

  it("rejects an unknown status", () => {
    // Arrange
    const payload = { status: "down", version: "0.1.0" };

    // Act
    const result = healthResponseSchema.safeParse(payload);

    // Assert
    expect(result.success).toBe(false);
  });
});
