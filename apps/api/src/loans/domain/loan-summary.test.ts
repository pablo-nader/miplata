import type { Account } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { repaymentSplit, summarizeLoans } from "./loan-summary";

function person(id: string, name: string, balances: Record<string, number>): Account {
  return {
    id,
    type: "person",
    name,
    nameKey: null,
    institution: null,
    closingDay: null,
    dueDay: null,
    isActive: true,
    canDelete: false,
    currencies: Object.entries(balances).map(([currency, balanceMinor]) => ({
      currency: currency as "ARS" | "USD",
      openingBalanceMinor: 0,
      balanceMinor,
    })),
  };
}

describe("summarizeLoans", () => {
  it("splits people into who owes the user and whom the user owes, per currency", () => {
    // Arrange
    const people = [
      person("b", "Beto", { ARS: -5_000_00, USD: 20_00 }),
      person("a", "Ana", { ARS: 10_000_00 }),
      person("c", "Cleared", { ARS: 0 }),
    ];

    // Act
    const result = summarizeLoans(people, []);

    // Assert
    expect(result.owesYou.map((entry) => entry.name)).toEqual(["Ana", "Beto"]);
    expect(result.youOwe.map((entry) => entry.name)).toEqual(["Beto"]);
    expect(result.owedToYouTotals).toEqual([
      { currency: "ARS", amountMinor: 10_000_00 },
      { currency: "USD", amountMinor: 20_00 },
    ]);
    expect(result.youOweTotals).toEqual([{ currency: "ARS", amountMinor: 5_000_00 }]);
  });

  it("attaches pending installments only to what the person owes the user", () => {
    // Arrange
    const people = [person("a", "Ana", { ARS: 9_000_00 })];
    const pending = [
      { personId: "a", currency: "ARS" as const, dueNowMinor: 3_000_00, totalMinor: 9_000_00 },
    ];

    // Act
    const result = summarizeLoans(people, pending);

    // Assert
    expect(result.owesYou[0]?.lines).toEqual([
      {
        currency: "ARS",
        amountMinor: 9_000_00,
        dueNowMinor: 3_000_00,
        pendingTotalMinor: 9_000_00,
      },
    ]);
  });
});

describe("repaymentSplit", () => {
  it.each([
    [100, 60, 60, 0],
    [100, 100, 100, 0],
    [100, 150, 100, 50],
    [0, 40, 40, 0],
    [-30, 40, 40, 0],
  ])(
    "balance %i repaid with %i settles %i and leaves %i extra",
    (balance, amount, settle, excess) => {
      expect(repaymentSplit(balance, amount)).toEqual({ settleMinor: settle, excessMinor: excess });
    },
  );
});
