import type { StatementDetail, StatementSummary, StatementTotals } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import {
  adjustmentOf,
  defaultPeriod,
  hasActivity,
  monthLabel,
  owedByPerson,
  payableMinor,
  positiveDifference,
  shortDate,
  totalsFor,
} from "./statement-view";

function totals(overrides: Partial<StatementTotals> = {}): StatementTotals {
  return {
    currency: "ARS",
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

function summary(periodMonth: string, closingDate: string): StatementSummary {
  return {
    id: periodMonth,
    accountId: "card",
    periodMonth,
    closingDate,
    dueDate: closingDate,
    totals: [],
  };
}

describe("defaultPeriod", () => {
  const items = [
    summary("2026-10", "2026-10-27"),
    summary("2026-11", "2026-11-27"),
    summary("2026-12", "2026-12-27"),
  ];

  it("picks the first statement that has not closed yet", () => {
    // Arrange
    const today = "2026-11-23";

    // Act
    const period = defaultPeriod(items, today);

    // Assert
    expect(period?.periodMonth).toBe("2026-11");
  });

  it("keeps a statement that closes today", () => {
    // Arrange
    const today = "2026-11-27";

    // Act
    const period = defaultPeriod(items, today);

    // Assert
    expect(period?.periodMonth).toBe("2026-11");
  });

  it("falls back to the latest statement when all have closed", () => {
    // Arrange
    const today = "2027-03-01";

    // Act
    const period = defaultPeriod(items, today);

    // Assert
    expect(period?.periodMonth).toBe("2026-12");
  });

  it("returns null without statements", () => {
    // Arrange
    const none: StatementSummary[] = [];

    // Act
    const period = defaultPeriod(none, "2026-11-23");

    // Assert
    expect(period).toBeNull();
  });
});

describe("totals helpers", () => {
  it("finds the totals of a currency", () => {
    // Arrange
    const statement = { totals: [totals(), totals({ currency: "USD", totalMinor: 35_00 })] };

    // Act
    const usd = totalsFor(statement, "USD");

    // Assert
    expect(usd?.totalMinor).toBe(35_00);
  });

  it.each([
    ["nothing", totals(), false],
    ["a previous balance", totals({ previousBalanceMinor: 1 }), true],
    ["purchases", totals({ ownMinor: 1 }), true],
    ["other people's installments", totals({ othersMinor: 1 }), true],
    ["charges", totals({ chargesMinor: 1 }), true],
    ["payments", totals({ paymentsMinor: 1 }), true],
    ["a negative total", totals({ totalMinor: -1 }), true],
  ])("tells whether there is activity for %s", (_label, value, expected) => {
    // Arrange
    const input = value;

    // Act
    const active = hasActivity(input);

    // Assert
    expect(active).toBe(expected);
  });

  it("has no activity without totals", () => {
    // Arrange
    const missing = undefined;

    // Act
    const active = hasActivity(missing);

    // Assert
    expect(active).toBe(false);
  });

  it("never asks to pay a negative total", () => {
    // Arrange
    const credit = totals({ totalMinor: -5_00 });

    // Act
    const payable = payableMinor(credit);

    // Assert
    expect(payable).toBe(0);
    expect(payableMinor(undefined)).toBe(0);
    expect(payableMinor(totals({ totalMinor: 7_00 }))).toBe(7_00);
  });

  it("only reports a positive difference with the bank", () => {
    // Arrange
    const above = totals({ differenceMinor: 30_00 });
    const below = totals({ differenceMinor: -30_00 });

    // Act
    const results = [
      positiveDifference(above),
      positiveDifference(below),
      positiveDifference(undefined),
    ];

    // Assert
    expect(results).toEqual([30_00, 0, 0]);
  });
});

describe("owedByPerson", () => {
  it("adds what each person owes per currency", () => {
    // Arrange
    const line = (personId: string | null, currency: "ARS" | "USD", amountMinor: number) => ({
      movementId: "m",
      description: null,
      personId,
      number: 1,
      installmentCount: 1,
      currency,
      amountMinor,
    });
    const others = [
      line("juan", "ARS", 100),
      line("juan", "ARS", 20),
      line("juan", "USD", 5),
      line(null, "ARS", 1),
    ];

    // Act
    const owed = owedByPerson(others);

    // Assert
    expect(owed).toEqual([
      { personId: "juan", currency: "ARS", amountMinor: 120 },
      { personId: "juan", currency: "USD", amountMinor: 5 },
      { personId: null, currency: "ARS", amountMinor: 1 },
    ]);
  });
});

describe("adjustmentOf", () => {
  it("adds the adjustment charges of a currency", () => {
    // Arrange
    const charge = (isAdjustment: boolean, currency: "ARS" | "USD", amountMinor: number) => ({
      movementId: "m",
      categoryId: null,
      description: null,
      occurredOn: "2026-11-27",
      currency,
      amountMinor,
      isAdjustment,
    });
    const detail = {
      charges: [charge(true, "ARS", 30), charge(false, "ARS", 99), charge(true, "USD", 7)],
    } as StatementDetail;

    // Act
    const adjusted = adjustmentOf(detail, "ARS");

    // Assert
    expect(adjusted).toBe(30);
  });
});

describe("labels", () => {
  it("shows a short capitalised month", () => {
    // Arrange
    const month = "2026-11";

    // Act
    const label = monthLabel(month, "es-AR");

    // Assert
    expect(label).toBe("Nov");
  });

  it("shows day and month in the order of the locale", () => {
    // Arrange
    const date = "2026-12-05";

    // Act
    const spanish = shortDate(date, "es-AR");
    const english = shortDate(date, "en-US");

    // Assert
    expect(spanish).toBe("5/12");
    expect(english).toBe("12/5");
  });
});
