import { describe, expect, it } from "vitest";
import {
  caretAfter,
  formatCanonical,
  interpretTyping,
  minorToCanonical,
  parseLocalized,
} from "./money-input";

describe("formatCanonical", () => {
  it.each([
    ["1234.56", "es-AR", "1.234,56"],
    ["1234.56", "en-US", "1,234.56"],
    ["1234567", "es-AR", "1.234.567"],
    ["1234567", "en-US", "1,234,567"],
    ["12.", "es-AR", "12,"],
    ["12.", "en-US", "12."],
    ["0", "es-AR", "0"],
    ["", "en-US", ""],
    ["-1500.5", "es-AR", "-1.500,5"],
  ] as const)("formats %s in %s as %s", (canonical, locale, expected) => {
    expect(formatCanonical(canonical, locale)).toBe(expected);
  });
});

describe("interpretTyping", () => {
  it("regroups digits as the user types in Spanish", () => {
    expect(interpretTyping("1234", 4, "es-AR").canonical).toBe("1234");
    expect(interpretTyping("1.2345", 6, "es-AR").canonical).toBe("12345");
  });

  it("takes the comma as the decimal separator in Spanish", () => {
    expect(interpretTyping("1.234,5", 7, "es-AR").canonical).toBe("1234.5");
  });

  it("ignores the group separator typed by the user", () => {
    expect(interpretTyping("1.", 2, "es-AR").canonical).toBe("1");
    expect(interpretTyping("1,", 2, "en-US").canonical).toBe("1");
  });

  it("takes the dot as the decimal separator in English", () => {
    expect(interpretTyping("1,234.56", 8, "en-US").canonical).toBe("1234.56");
  });

  it("keeps a trailing decimal separator and a leading one", () => {
    expect(interpretTyping("12,", 3, "es-AR").canonical).toBe("12.");
    expect(interpretTyping(",5", 2, "es-AR").canonical).toBe("0.5");
  });

  it("drops letters, a second decimal separator and extra decimals", () => {
    expect(interpretTyping("1a2", 3, "es-AR").canonical).toBe("12");
    expect(interpretTyping("1,2,3", 5, "es-AR").canonical).toBe("1.23");
    expect(interpretTyping("1,234", 5, "es-AR").canonical).toBe("1.23");
  });

  it("keeps the caret after a leading decimal separator", () => {
    expect(interpretTyping(",", 1, "es-AR")).toEqual({ canonical: "0.", significantBefore: 2 });
    expect(caretAfter("0,", 2, "es-AR")).toBe(2);
  });

  it("allows clearing and zero", () => {
    expect(interpretTyping("", 0, "es-AR").canonical).toBe("");
    expect(interpretTyping("0", 1, "en-US").canonical).toBe("0");
    expect(interpretTyping("007", 3, "en-US").canonical).toBe("7");
  });

  it("limits the integer digits", () => {
    expect(interpretTyping("1".repeat(15), 15, "en-US").canonical).toBe("1".repeat(10));
  });

  it("accepts a minus sign only when negatives are allowed", () => {
    expect(interpretTyping("-5", 2, "es-AR").canonical).toBe("5");
    expect(interpretTyping("-5", 2, "es-AR", true).canonical).toBe("-5");
  });

  it("counts the significant characters before the caret", () => {
    expect(interpretTyping("1.2345", 3, "es-AR").significantBefore).toBe(2);
  });
});

describe("caretAfter", () => {
  it("places the caret after the same digit once separators are added", () => {
    expect(caretAfter("12.345", 4, "es-AR")).toBe(5);
    expect(caretAfter("12.345", 0, "es-AR")).toBe(0);
    expect(caretAfter("12.345", 9, "es-AR")).toBe(6);
  });
});

describe("parseLocalized", () => {
  it.each([
    ["1.234,56", "1234.56"],
    ["1,234.56", "1234.56"],
    ["1.234", "1234"],
    ["1,234", "1234"],
    ["12,5", "12.5"],
    ["12.5", "12.5"],
    ["1.234.567", "1234567"],
    ["US$ 1,000", "1000"],
    ["$ 2.500,00", "2500.00"],
    ["abc", ""],
    ["0.500", "0.50"],
    ["0,125", "0.12"],
    ["12345678901", ""],
  ] as const)("reads %s as %s", (text, expected) => {
    expect(parseLocalized(text)).toBe(expected);
  });

  it("keeps the sign only when negatives are allowed", () => {
    expect(parseLocalized("-1.500")).toBe("1500");
    expect(parseLocalized("-1.500", true)).toBe("-1500");
  });
});

describe("minor units", () => {
  it.each([
    [0, "0"],
    [150_000, "1500"],
    [150_050, "1500.50"],
    [5, "0.05"],
    [-1_250, "-12.50"],
  ])("writes %i minor units as %s", (minor, canonical) => {
    expect(minorToCanonical(minor)).toBe(canonical);
  });
});
