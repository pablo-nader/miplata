import { describe, expect, it } from "vitest";
import { divideRounded, sumMinorUnits, toSafeInteger } from "./rounding";

describe("divideRounded", () => {
  it.each([
    [7n, 2n, "floor", 3n],
    [7n, 2n, "ceil", 4n],
    [7n, 2n, "half-up", 4n],
    [5n, 2n, "half-up", 3n],
    [4n, 2n, "ceil", 2n],
    [0n, 3n, "ceil", 0n],
    [10n, 3n, "half-up", 3n],
  ] as const)("divides %s by %s with %s", (numerator, denominator, mode, expected) => {
    // Arrange
    const input = { numerator, denominator, mode };

    // Act
    const result = divideRounded(input.numerator, input.denominator, input.mode);

    // Assert
    expect(result).toBe(expected);
  });

  it("rejects a negative numerator", () => {
    // Arrange
    const numerator = -7n;

    // Act
    const act = () => divideRounded(numerator, 2n, "floor");

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects a non-positive denominator", () => {
    // Arrange
    const denominator = 0n;

    // Act
    const act = () => divideRounded(1n, denominator, "floor");

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("toSafeInteger", () => {
  it("converts values inside the safe range", () => {
    // Arrange
    const value = -9007199254740991n;

    // Act
    const result = toSafeInteger(value);

    // Assert
    expect(result).toBe(-9007199254740991);
  });

  it("rejects values outside the safe range in both directions", () => {
    // Arrange
    const values = [9007199254740992n, -9007199254740992n];

    // Act
    const acts = values.map((v) => () => toSafeInteger(v));

    // Assert
    for (const act of acts) expect(act).toThrow(RangeError);
  });
});

describe("sumMinorUnits", () => {
  it("adds integers", () => {
    // Arrange
    const values = [100, -30, 5];

    // Act
    const result = sumMinorUnits(values);

    // Assert
    expect(result).toBe(75);
  });

  it("is zero for an empty list", () => {
    // Arrange
    const values: number[] = [];

    // Act
    const result = sumMinorUnits(values);

    // Assert
    expect(result).toBe(0);
  });

  it("rejects a non-integer element", () => {
    // Arrange
    const values = [1, 0.5];

    // Act
    const act = () => sumMinorUnits(values);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects a total outside the safe integer range", () => {
    // Arrange
    const values = [Number.MAX_SAFE_INTEGER, 1];

    // Act
    const act = () => sumMinorUnits(values);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("does not hide an intermediate overflow that later cancels out", () => {
    // Arrange
    const values = [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER];

    // Act
    const result = sumMinorUnits(values);

    // Assert
    expect(result).toBe(Number.MAX_SAFE_INTEGER);
  });
});
