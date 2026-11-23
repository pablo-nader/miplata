import { describe, expect, it } from "vitest";
import {
  addMoney,
  compareMoney,
  currencySchema,
  isZeroMoney,
  minorUnitsSchema,
  money,
  moneySchema,
  negateMoney,
  parseMoney,
  subtractMoney,
  sumMoney,
} from "./money";

describe("money", () => {
  it("creates a value from integer minor units", () => {
    // Arrange
    const minor = 123456;

    // Act
    const result = money(minor, "ARS");

    // Assert
    expect(result).toEqual({ amountMinor: 123456, currency: "ARS" });
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
    "rejects the non-safe-integer amount %s",
    (minor) => {
      // Arrange
      const amount = minor;

      // Act
      const act = () => money(amount, "ARS");

      // Assert
      expect(act).toThrow(RangeError);
    },
  );

  it("normalizes negative zero", () => {
    // Arrange
    const minor = -0;

    // Act
    const result = money(minor, "USD");

    // Assert
    expect(Object.is(result.amountMinor, 0)).toBe(true);
  });

  it("rejects an unsupported currency", () => {
    // Arrange
    const currency = "EUR" as never;

    // Act
    const act = () => money(100, currency);

    // Assert
    expect(act).toThrow(TypeError);
  });
});

describe("money arithmetic", () => {
  it("adds amounts of the same currency", () => {
    // Arrange
    const a = money(100, "ARS");
    const b = money(250, "ARS");

    // Act
    const result = addMoney(a, b);

    // Assert
    expect(result).toEqual(money(350, "ARS"));
  });

  it("subtracts amounts of the same currency", () => {
    // Arrange
    const a = money(100, "USD");
    const b = money(250, "USD");

    // Act
    const result = subtractMoney(a, b);

    // Assert
    expect(result).toEqual(money(-150, "USD"));
  });

  it("rejects adding different currencies", () => {
    // Arrange
    const a = money(100, "ARS");
    const b = money(100, "USD");

    // Act
    const act = () => addMoney(a, b);

    // Assert
    expect(act).toThrow(/currency/i);
  });

  it("rejects subtracting different currencies", () => {
    // Arrange
    const a = money(100, "ARS");
    const b = money(100, "USD");

    // Act
    const act = () => subtractMoney(a, b);

    // Assert
    expect(act).toThrow(/currency/i);
  });

  it("rejects an addition that leaves the safe integer range", () => {
    // Arrange
    const a = money(Number.MAX_SAFE_INTEGER, "ARS");
    const b = money(1, "ARS");

    // Act
    const act = () => addMoney(a, b);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("negates an amount", () => {
    // Arrange
    const a = money(500, "ARS");

    // Act
    const result = negateMoney(a);

    // Assert
    expect(result).toEqual(money(-500, "ARS"));
  });

  it("negating zero stays zero", () => {
    // Arrange
    const a = money(0, "ARS");

    // Act
    const result = negateMoney(a);

    // Assert
    expect(Object.is(result.amountMinor, 0)).toBe(true);
  });

  it("detects zero", () => {
    // Arrange
    const zero = money(0, "USD");
    const other = money(1, "USD");

    // Act
    const results = [isZeroMoney(zero), isZeroMoney(other)];

    // Assert
    expect(results).toEqual([true, false]);
  });

  it("compares amounts of the same currency", () => {
    // Arrange
    const small = money(1, "ARS");
    const big = money(2, "ARS");

    // Act
    const results = [compareMoney(small, big), compareMoney(big, small), compareMoney(big, big)];

    // Assert
    expect(results).toEqual([-1, 1, 0]);
  });

  it("rejects comparing different currencies", () => {
    // Arrange
    const a = money(1, "ARS");
    const b = money(1, "USD");

    // Act
    const act = () => compareMoney(a, b);

    // Assert
    expect(act).toThrow(/currency/i);
  });

  it("sums a list in a given currency", () => {
    // Arrange
    const list = [money(100, "ARS"), money(200, "ARS"), money(300, "ARS")];

    // Act
    const result = sumMoney(list, "ARS");

    // Assert
    expect(result).toEqual(money(600, "ARS"));
  });

  it("sums an empty list to zero of the given currency", () => {
    // Arrange
    const list: ReturnType<typeof money>[] = [];

    // Act
    const result = sumMoney(list, "USD");

    // Assert
    expect(result).toEqual(money(0, "USD"));
  });

  it("rejects a list that mixes currencies", () => {
    // Arrange
    const list = [money(100, "ARS"), money(200, "USD")];

    // Act
    const act = () => sumMoney(list, "ARS");

    // Assert
    expect(act).toThrow(/currency/i);
  });
});

describe("parseMoney", () => {
  it.each([
    ["1234", 123400],
    ["1234.5", 123450],
    ["1234.56", 123456],
    ["1234,56", 123456],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["1.234.567,89", 123456789],
    ["1,234,567.89", 123456789],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["12,5", 1250],
    ["0,5", 50],
    ["0.05", 5],
    [".5", 50],
    [",5", 50],
    ["  $ 48.300 ", 4830000],
    ["-1.234,56", -123456],
    ["+10", 1000],
    ["0", 0],
    ["1234.00", 123400],
  ])("parses %s", (input, expected) => {
    // Arrange
    const text = input;

    // Act
    const result = parseMoney(text, "ARS");

    // Assert
    expect(result).toEqual(money(expected, "ARS"));
  });

  it.each([
    "",
    "   ",
    "abc",
    "1,2,3",
    "1.2.3",
    "1.234,567",
    "12.345,6,7",
    "--5",
    "5-",
    "1e5",
    "$",
    "1..2",
    "1,,2",
    "1.234.56",
    "1,234",
    "1234.567",
    "1,234.56,7",
  ])("rejects %s", (input) => {
    // Arrange
    const text = input;

    // Act
    const act = () => parseMoney(text, "ARS");

    // Assert
    expect(act).toThrow(SyntaxError);
  });

  it("rejects amounts beyond the safe integer range", () => {
    // Arrange
    const text = "99999999999999999999";

    // Act
    const act = () => parseMoney(text, "ARS");

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("schemas", () => {
  it("accepts the supported currencies", () => {
    // Arrange
    const inputs = ["ARS", "USD"];

    // Act
    const results = inputs.map((c) => currencySchema.safeParse(c).success);

    // Assert
    expect(results).toEqual([true, true]);
  });

  it.each(["EUR", "ars", "", 5])("rejects the currency %s", (input) => {
    // Arrange
    const value = input;

    // Act
    const result = currencySchema.safeParse(value);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepts safe integers as minor units", () => {
    // Arrange
    const inputs = [0, 1, -1, 4830000];

    // Act
    const results = inputs.map((n) => minorUnitsSchema.safeParse(n).success);

    // Assert
    expect(results).toEqual([true, true, true, true]);
  });

  it.each([1.5, "10", Number.NaN, Number.MAX_SAFE_INTEGER + 1])(
    "rejects the minor units %s",
    (input) => {
      // Arrange
      const value = input;

      // Act
      const result = minorUnitsSchema.safeParse(value);

      // Assert
      expect(result.success).toBe(false);
    },
  );

  it("parses a money object", () => {
    // Arrange
    const input = { amountMinor: 1000, currency: "USD" };

    // Act
    const result = moneySchema.safeParse(input);

    // Assert
    expect(result.success && result.data).toEqual(money(1000, "USD"));
  });

  it("rejects a money object with a bad currency or amount", () => {
    // Arrange
    const inputs = [
      { amountMinor: 1000, currency: "EUR" },
      { amountMinor: 10.5, currency: "ARS" },
      { amountMinor: 10 },
    ];

    // Act
    const results = inputs.map((i) => moneySchema.safeParse(i).success);

    // Assert
    expect(results).toEqual([false, false, false]);
  });
});
