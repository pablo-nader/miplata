import type { Account, AccountType, Currency } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { accountBalance, balanceLines, balanceTotals } from "./balance";

function account(
  id: string,
  type: AccountType,
  name: string,
  balances: Partial<Record<Currency, number>>,
  isActive = true,
): Account {
  return {
    id,
    type,
    name,
    nameKey: null,
    institution: null,
    closingDay: null,
    dueDay: null,
    isActive,
    canDelete: true,
    currencies: Object.entries(balances).map(([currency, balanceMinor]) => ({
      currency: currency as Currency,
      openingBalanceMinor: 0,
      balanceMinor,
    })),
  };
}

describe("accountBalance", () => {
  it("adds postings to the opening balance", () => {
    // Arrange
    const opening = 100_000;
    const posted = -25_050;

    // Act
    const balance = accountBalance(opening, posted);

    // Assert
    expect(balance).toBe(74_950);
  });

  it("rejects a total outside the safe integer range", () => {
    // Arrange
    const opening = Number.MAX_SAFE_INTEGER;

    // Act
    const act = () => accountBalance(opening, 10);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("balanceTotals", () => {
  it("counts card debt against the total and adds what people owe", () => {
    // Arrange
    const lines = balanceLines([
      account("bank", "bank", "Galicia", { ARS: 2_410_000_00, USD: 1_000_00 }),
      account("cash", "cash", "Cash", { ARS: 41_000_00, USD: 450_00 }),
      account("card", "credit_card", "Visa", { ARS: -1_104_900_00 }),
      account("juan", "person", "Juan", { ARS: 220_000_00 }),
      account("sofi", "person", "Sofi", { USD: -200_00 }),
    ]);

    // Act
    const totals = balanceTotals(lines);

    // Assert
    expect(totals).toEqual([
      { currency: "ARS", totalMinor: 1_566_100_00 },
      { currency: "USD", totalMinor: 1_250_00 },
    ]);
  });

  it("ignores inactive accounts", () => {
    // Arrange
    const lines = balanceLines([
      account("a", "bank", "Active", { ARS: 500 }),
      account("b", "bank", "Closed", { ARS: 900 }, false),
    ]);

    // Act
    const totals = balanceTotals(lines);

    // Assert
    expect(totals).toEqual([
      { currency: "ARS", totalMinor: 500 },
      { currency: "USD", totalMinor: 0 },
    ]);
  });

  it("returns zero totals when there are no accounts", () => {
    // Arrange
    const lines = balanceLines([]);

    // Act
    const totals = balanceTotals(lines);

    // Assert
    expect(totals).toEqual([
      { currency: "ARS", totalMinor: 0 },
      { currency: "USD", totalMinor: 0 },
    ]);
  });
});

describe("balanceLines", () => {
  it("orders by type, then name", () => {
    // Arrange
    const accounts = [
      account("p", "person", "Juan", { ARS: 1 }),
      account("c", "credit_card", "Visa", { ARS: -1 }),
      account("k", "cash", "Cash", { ARS: 1 }),
      account("w", "wallet", "Mercado Pago", { ARS: 1 }),
      account("b2", "bank", "Santander", { ARS: 1 }),
      account("b1", "bank", "Galicia", { ARS: 1 }),
    ];

    // Act
    const order = balanceLines(accounts).map((line) => line.accountId);

    // Assert
    expect(order).toEqual(["b1", "b2", "w", "k", "c", "p"]);
  });
});
