import type { StatementTotals } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import {
  amountsFor,
  buildPayment,
  emptyPayForm,
  hasMinimum,
  type PayForm,
  parseOptionalMinor,
} from "./pay-form";

function totals(
  currency: "ARS" | "USD",
  overrides: Partial<StatementTotals> = {},
): StatementTotals {
  return {
    currency,
    previousBalanceMinor: 0,
    ownMinor: 0,
    othersMinor: 0,
    chargesMinor: 0,
    paymentsMinor: 0,
    totalMinor: 0,
    minimumMinor: null,
    bankTotalMinor: null,
    differenceMinor: null,
    ...overrides,
  };
}

const ars = totals("ARS", { totalMinor: 504_900_00, minimumMinor: 50_000_00 });
const usd = totals("USD", { totalMinor: 35_00, minimumMinor: 10_00 });

function form(overrides: Partial<PayForm> = {}): PayForm {
  return { ...emptyPayForm("2026-12-05"), sourceId: "bank", ...overrides };
}

describe("parseOptionalMinor", () => {
  it.each([
    ["", 0],
    ["  ", 0],
    ["1.500,50", 1_500_50],
    ["abc", null],
    ["-5", null],
  ])("reads %j as %j", (text, expected) => {
    // Arrange
    const input = text;

    // Act
    const minor = parseOptionalMinor(input, "ARS");

    // Assert
    expect(minor).toBe(expected);
  });
});

describe("amountsFor", () => {
  it("pays the whole total of each currency", () => {
    // Arrange
    const current = form({ mode: "total" });

    // Act
    const amounts = amountsFor(current, ars, usd);

    // Assert
    expect(amounts).toEqual({ arsMinor: 504_900_00, usdMinor: 35_00 });
  });

  it("pays nothing in a currency that is not owed", () => {
    // Arrange
    const credit = totals("ARS", { totalMinor: -10_00 });

    // Act
    const amounts = amountsFor(form(), credit, undefined);

    // Assert
    expect(amounts).toEqual({ arsMinor: 0, usdMinor: 0 });
  });

  it("pays the minimum but never more than what is owed", () => {
    // Arrange
    const small = totals("ARS", { totalMinor: 20_000_00, minimumMinor: 50_000_00 });

    // Act
    const amounts = amountsFor(form({ mode: "minimum" }), small, usd);

    // Assert
    expect(amounts).toEqual({ arsMinor: 20_000_00, usdMinor: 10_00 });
  });

  it("pays nothing when the minimum is unknown", () => {
    // Arrange
    const unknown = totals("ARS", { totalMinor: 20_000_00 });

    // Act
    const amounts = amountsFor(form({ mode: "minimum" }), unknown, undefined);

    // Assert
    expect(amounts).toEqual({ arsMinor: 0, usdMinor: 0 });
  });

  it("reads the typed amounts for another amount and rejects bad text", () => {
    // Arrange
    const typed = form({ mode: "other", arsText: "1000", usdText: "" });
    const wrong = form({ mode: "other", arsText: "x" });

    // Act
    const amounts = amountsFor(typed, ars, usd);
    const invalid = amountsFor(wrong, ars, usd);

    // Assert
    expect(amounts).toEqual({ arsMinor: 1000_00, usdMinor: 0 });
    expect(invalid).toBeNull();
  });
});

describe("hasMinimum", () => {
  it("is true when any currency has a minimum", () => {
    // Arrange
    const withoutMinimum = totals("ARS");

    // Act
    const results = [hasMinimum(ars, undefined), hasMinimum(withoutMinimum, undefined)];

    // Assert
    expect(results).toEqual([true, false]);
  });
});

describe("buildPayment", () => {
  it("builds a payment in dollars", () => {
    // Arrange
    const amounts = { arsMinor: 504_900_00, usdMinor: 35_00 };

    // Act
    const built = buildPayment(form(), amounts);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        fromAccountId: "bank",
        occurredOn: "2026-12-05",
        arsMinor: 504_900_00,
        usdMinor: 35_00,
        usdSource: "usd",
        usdSourceAmountMinor: null,
      },
    });
  });

  it("builds an exchange when the dollars are paid with pesos", () => {
    // Arrange
    const current = form({ usdWithPesos: true, pesosText: "43.050" });

    // Act
    const built = buildPayment(current, { arsMinor: 0, usdMinor: 35_00 });

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: { usdSource: "ars", usdSourceAmountMinor: 43_050_00 },
    });
  });

  it("ignores the exchange when there are no dollars to pay", () => {
    // Arrange
    const current = form({ usdWithPesos: true, pesosText: "" });

    // Act
    const built = buildPayment(current, { arsMinor: 10_00, usdMinor: 0 });

    // Assert
    expect(built).toMatchObject({ ok: true, value: { usdSource: "usd" } });
  });

  it.each([
    ["no source account", form({ sourceId: null }), { arsMinor: 1, usdMinor: 0 }, "source"],
    ["a bad date", form({ date: "x" }), { arsMinor: 1, usdMinor: 0 }, "date"],
    ["nothing to pay", form(), { arsMinor: 0, usdMinor: 0 }, "amount"],
    ["unreadable amounts", form(), null, "amount"],
    [
      "an exchange without pesos",
      form({ usdWithPesos: true }),
      { arsMinor: 0, usdMinor: 5 },
      "pesos",
    ],
  ])("rejects %s", (_label, current, amounts, key) => {
    // Arrange
    const input = current;

    // Act
    const built = buildPayment(input, amounts);

    // Assert
    expect(built).toEqual({ ok: false, errors: { [key]: true } });
  });
});
