import { describe, expect, it } from "vitest";
import {
  arsFromUsd,
  exchangeRateSchema,
  parseExchangeRate,
  rateFromAmounts,
  usdFromArs,
} from "./exchange";
import { money } from "./money";

describe("rateFromAmounts", () => {
  it("derives pesos per dollar from both amounts", () => {
    // Arrange
    const ars = money(123000000, "ARS");
    const usd = money(100000, "USD");

    // Act
    const rate = rateFromAmounts(ars, usd, "half-up");

    // Assert
    expect(rate).toBe(12300000);
  });

  it("keeps four decimals", () => {
    // Arrange
    const ars = money(100000, "ARS");
    const usd = money(80, "USD");

    // Act
    const rate = rateFromAmounts(ars, usd, "half-up");

    // Assert
    expect(rate).toBe(12500000);
  });

  it("rounds half up", () => {
    // Arrange
    const ars = money(2, "ARS");
    const usd = money(3, "USD");

    // Act
    const rate = rateFromAmounts(ars, usd, "half-up");

    // Assert
    expect(rate).toBe(6667);
  });

  it("rounds down on request", () => {
    // Arrange
    const ars = money(2, "ARS");
    const usd = money(3, "USD");

    // Act
    const rate = rateFromAmounts(ars, usd, "floor");

    // Assert
    expect(rate).toBe(6666);
  });

  it("rounds up on request", () => {
    // Arrange
    const ars = money(1, "ARS");
    const usd = money(3, "USD");

    // Act
    const rate = rateFromAmounts(ars, usd, "ceil");

    // Assert
    expect(rate).toBe(3334);
  });

  it("rejects a zero or negative dollar amount", () => {
    // Arrange
    const ars = money(100, "ARS");

    // Act
    const acts = [0, -5].map((n) => () => rateFromAmounts(ars, money(n, "USD"), "half-up"));

    // Assert
    for (const act of acts) expect(act).toThrow(RangeError);
  });

  it("rejects a zero or negative peso amount", () => {
    // Arrange
    const usd = money(100, "USD");

    // Act
    const acts = [0, -5].map((n) => () => rateFromAmounts(money(n, "ARS"), usd, "half-up"));

    // Assert
    for (const act of acts) expect(act).toThrow(RangeError);
  });

  it("rejects swapped currencies", () => {
    // Arrange
    const ars = money(100, "USD");
    const usd = money(100, "ARS");

    // Act
    const act = () => rateFromAmounts(ars, usd, "half-up");

    // Assert
    expect(act).toThrow(/currency/i);
  });
});

describe("arsFromUsd", () => {
  it("converts dollars to pesos with the rate", () => {
    // Arrange
    const usd = money(100000, "USD");
    const rate = 12300000;

    // Act
    const result = arsFromUsd(usd, rate, "half-up");

    // Assert
    expect(result).toEqual(money(123000000, "ARS"));
  });

  it("rounds half up to the centavo", () => {
    // Arrange
    const usd = money(5, "USD");
    const rate = 13000;

    // Act
    const result = arsFromUsd(usd, rate, "half-up");

    // Assert
    expect(result).toEqual(money(7, "ARS"));
  });

  it("rounds down to the centavo", () => {
    // Arrange
    const usd = money(5, "USD");
    const rate = 13000;

    // Act
    const result = arsFromUsd(usd, rate, "floor");

    // Assert
    expect(result).toEqual(money(6, "ARS"));
  });

  it("rounds up to the centavo", () => {
    // Arrange
    const usd = money(1, "USD");
    const rate = 12000;

    // Act
    const result = arsFromUsd(usd, rate, "ceil");

    // Assert
    expect(result).toEqual(money(2, "ARS"));
  });

  it("rejects a non-positive rate", () => {
    // Arrange
    const usd = money(100, "USD");

    // Act
    const act = () => arsFromUsd(usd, 0, "half-up");

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects a negative dollar amount", () => {
    // Arrange
    const usd = money(-100, "USD");

    // Act
    const act = () => arsFromUsd(usd, 12300000, "half-up");

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects pesos as input", () => {
    // Arrange
    const ars = money(100, "ARS");

    // Act
    const act = () => arsFromUsd(ars, 12300000, "half-up");

    // Assert
    expect(act).toThrow(/currency/i);
  });
});

describe("usdFromArs", () => {
  it("converts pesos to dollars with the rate", () => {
    // Arrange
    const ars = money(123000000, "ARS");
    const rate = 12300000;

    // Act
    const result = usdFromArs(ars, rate, "half-up");

    // Assert
    expect(result).toEqual(money(100000, "USD"));
  });

  it("rounds half up to the cent", () => {
    // Arrange
    const ars = money(3, "ARS");
    const rate = 20000;

    // Act
    const result = usdFromArs(ars, rate, "half-up");

    // Assert
    expect(result).toEqual(money(2, "USD"));
  });

  it("rounds down to the cent", () => {
    // Arrange
    const ars = money(5, "ARS");
    const rate = 30000;

    // Act
    const result = usdFromArs(ars, rate, "floor");

    // Assert
    expect(result).toEqual(money(1, "USD"));
  });

  it("rounds up to the cent", () => {
    // Arrange
    const ars = money(4, "ARS");
    const rate = 30000;

    // Act
    const result = usdFromArs(ars, rate, "ceil");

    // Assert
    expect(result).toEqual(money(2, "USD"));
  });

  it("rejects a negative amount", () => {
    // Arrange
    const negative = money(-1, "ARS");

    // Act
    const act = () => usdFromArs(negative, 1000000, "floor");

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects dollars as input", () => {
    // Arrange
    const dollars = money(1, "USD");

    // Act
    const act = () => usdFromArs(dollars, 1000000, "floor");

    // Assert
    expect(act).toThrow(/currency/i);
  });

  it("rejects a non-positive rate", () => {
    // Arrange
    const ars = money(100, "ARS");

    // Act
    const act = () => usdFromArs(ars, -1, "half-up");

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("handles amounts whose product exceeds the safe integer range", () => {
    // Arrange
    const ars = money(9007199254740000, "ARS");
    const rate = 10000;

    // Act
    const result = usdFromArs(ars, rate, "half-up");

    // Assert
    expect(result).toEqual(money(9007199254740000, "USD"));
  });
});

describe("parseExchangeRate", () => {
  it.each([
    ["1230", 12300000],
    ["1230.5", 12305000],
    ["1.230,5", 12305000],
    ["1230,5025", 12305025],
    ["0,5", 5000],
  ])("parses %s", (input, expected) => {
    // Arrange
    const text = input;

    // Act
    const result = parseExchangeRate(text);

    // Assert
    expect(result).toBe(expected);
  });

  it.each(["1230.12345", "0", "abc", "-5", ""])("rejects %s", (input) => {
    // Arrange
    const text = input;

    // Act
    const act = () => parseExchangeRate(text);

    // Assert
    expect(act).toThrow();
  });
});

describe("exchangeRateSchema", () => {
  it("accepts positive safe integers and rejects the rest", () => {
    // Arrange
    const inputs = [1, 12300000, 0, -1, 1.5, "1"];

    // Act
    const results = inputs.map((i) => exchangeRateSchema.safeParse(i).success);

    // Assert
    expect(results).toEqual([true, true, false, false, false, false]);
  });
});
