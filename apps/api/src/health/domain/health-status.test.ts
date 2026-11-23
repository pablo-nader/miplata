import { describe, expect, it } from "vitest";
import { healthy } from "./health-status";

describe("healthy", () => {
  it("builds an ok status carrying the version", () => {
    // Arrange
    const version = "2.0.0";

    // Act
    const result = healthy(version);

    // Assert
    expect(result).toEqual({ status: "ok", version: "2.0.0" });
  });
});
