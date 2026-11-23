import { describe, expect, it } from "vitest";
import { FOREIGN_KEY_VIOLATION, pgErrorCode, UNIQUE_VIOLATION } from "./pg-error";

describe("pgErrorCode", () => {
  it("reads the code of a driver error", () => {
    // Arrange
    const error = { code: UNIQUE_VIOLATION };

    // Act
    const code = pgErrorCode(error);

    // Assert
    expect(code).toBe("23505");
  });

  it("finds the code on the cause of a wrapped error", () => {
    // Arrange
    const error = new Error("query failed", { cause: { code: FOREIGN_KEY_VIOLATION } });

    // Act
    const code = pgErrorCode(error);

    // Assert
    expect(code).toBe("23503");
  });

  it("returns undefined for errors without a code and for non-objects", () => {
    // Arrange
    const inputs = [
      new Error("plain"),
      null,
      "text",
      undefined,
      { cause: { cause: { cause: {} } } },
    ];

    // Act
    const codes = inputs.map((input) => pgErrorCode(input));

    // Assert
    expect(codes).toEqual([undefined, undefined, undefined, undefined, undefined]);
  });
});
