import { describe, expect, it } from "vitest";
import {
  addMonths,
  compareMonths,
  dateInMonth,
  daysInMonth,
  isoDateSchema,
  monthOf,
  monthsBetween,
  yearMonthSchema,
} from "./calendar";

describe("monthOf", () => {
  it("returns the year and month of a date", () => {
    // Arrange
    const date = "2026-11-23";

    // Act
    const result = monthOf(date);

    // Assert
    expect(result).toBe("2026-11");
  });
});

describe("daysInMonth", () => {
  it.each([
    ["2026-01", 31],
    ["2026-02", 28],
    ["2028-02", 29],
    ["1900-02", 28],
    ["2000-02", 29],
    ["2026-04", 30],
    ["2026-12", 31],
  ])("returns the length of %s", (month, expected) => {
    // Arrange
    const input = month;

    // Act
    const result = daysInMonth(input);

    // Assert
    expect(result).toBe(expected);
  });
});

describe("dateInMonth", () => {
  it("builds a date on the requested day", () => {
    // Arrange
    const month = "2026-03";

    // Act
    const result = dateInMonth(month, 5);

    // Assert
    expect(result).toBe("2026-03-05");
  });

  it("clamps day 31 to the last day of a short month", () => {
    // Arrange
    const month = "2026-02";

    // Act
    const result = dateInMonth(month, 31);

    // Assert
    expect(result).toBe("2026-02-28");
  });

  it("clamps day 30 in a leap february", () => {
    // Arrange
    const month = "2028-02";

    // Act
    const result = dateInMonth(month, 30);

    // Assert
    expect(result).toBe("2028-02-29");
  });

  it("rejects a day below one", () => {
    // Arrange
    const month = "2026-02";

    // Act
    const act = () => dateInMonth(month, 0);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects a fractional day", () => {
    // Arrange
    const month = "2026-02";

    // Act
    const act = () => dateInMonth(month, 1.5);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("addMonths", () => {
  it.each([
    ["2026-11", 1, "2026-12"],
    ["2026-12", 1, "2027-01"],
    ["2026-01", -1, "2025-12"],
    ["2026-05", 0, "2026-05"],
    ["2026-05", 25, "2028-06"],
    ["2026-05", -17, "2024-12"],
  ])("adds to %s the offset %i", (month, offset, expected) => {
    // Arrange
    const input = month;

    // Act
    const result = addMonths(input, offset);

    // Assert
    expect(result).toBe(expected);
  });
});

describe("compareMonths", () => {
  it("orders months chronologically", () => {
    // Arrange
    const months = ["2027-01", "2026-12", "2026-02"];

    // Act
    const result = [...months].sort(compareMonths);

    // Assert
    expect(result).toEqual(["2026-02", "2026-12", "2027-01"]);
  });

  it("returns zero for equal months", () => {
    // Arrange
    const month = "2026-02";

    // Act
    const result = compareMonths(month, month);

    // Assert
    expect(result).toBe(0);
  });
});

describe("monthsBetween", () => {
  it("lists every month inclusive", () => {
    // Arrange
    const from = "2026-11";
    const to = "2027-02";

    // Act
    const result = monthsBetween(from, to);

    // Assert
    expect(result).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
  });

  it("returns a single month when both ends match", () => {
    // Arrange
    const month = "2026-11";

    // Act
    const result = monthsBetween(month, month);

    // Assert
    expect(result).toEqual(["2026-11"]);
  });

  it("returns nothing when the range is reversed", () => {
    // Arrange
    const from = "2026-12";
    const to = "2026-11";

    // Act
    const result = monthsBetween(from, to);

    // Assert
    expect(result).toEqual([]);
  });
});

describe("isoDateSchema", () => {
  it("accepts a real calendar date", () => {
    // Arrange
    const input = "2028-02-29";

    // Act
    const result = isoDateSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each(["2026-02-29", "2026-13-01", "2026-00-10", "2026-1-1", "26-01-01", "", "2026-04-31"])(
    "rejects %s",
    (input) => {
      // Arrange
      const value = input;

      // Act
      const result = isoDateSchema.safeParse(value);

      // Assert
      expect(result.success).toBe(false);
    },
  );
});

describe("yearMonthSchema", () => {
  it("accepts a valid month", () => {
    // Arrange
    const input = "2026-12";

    // Act
    const result = yearMonthSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each(["2026-13", "2026-00", "2026-1", "2026-12-01"])("rejects %s", (input) => {
    // Arrange
    const value = input;

    // Act
    const result = yearMonthSchema.safeParse(value);

    // Assert
    expect(result.success).toBe(false);
  });
});
