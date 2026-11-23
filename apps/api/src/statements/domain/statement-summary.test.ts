import { describe, expect, it } from "vitest";
import {
  type AmountLine,
  checkStatementDates,
  type StatementRow,
  summarizeStatements,
} from "./statement-summary";

const none = { ARS: null, USD: null };

function row(id: string, periodMonth: string, overrides: Partial<StatementRow> = {}): StatementRow {
  return {
    id,
    accountId: "card",
    periodMonth,
    closingDate: `${periodMonth}-27`,
    dueDate: `${periodMonth}-28`,
    minimumMinor: none,
    bankTotalMinor: none,
    ...overrides,
  };
}

function line(
  statementId: string,
  kind: AmountLine["kind"],
  amountMinor: number,
  currency: AmountLine["currency"] = "ARS",
): AmountLine {
  return { statementId, currency, kind, amountMinor };
}

const noOpening = { ARS: 0, USD: 0 };

describe("summarizeStatements", () => {
  it("adds purchases, other people's installments and charges and subtracts payments", () => {
    // Arrange
    const input = {
      statements: [row("s1", "2026-11")],
      lines: [
        line("s1", "own", 348_300_00),
        line("s1", "others", 120_000_00),
        line("s1", "charges", 36_600_00),
        line("s1", "payments", 100_00),
      ],
      currencies: ["ARS" as const],
      openingDebtMinor: noOpening,
    };

    // Act
    const [summary] = summarizeStatements(input);

    // Assert
    expect(summary?.totals[0]).toMatchObject({
      previousBalanceMinor: 0,
      ownMinor: 348_300_00,
      othersMinor: 120_000_00,
      chargesMinor: 36_600_00,
      paymentsMinor: 100_00,
      totalMinor: 504_800_00,
    });
  });

  it("carries the unpaid balance of a partial payment into the next statement", () => {
    // Arrange
    const input = {
      statements: [row("s2", "2026-12"), row("s1", "2026-11")],
      lines: [line("s1", "own", 100_00), line("s1", "payments", 40_00), line("s2", "own", 30_00)],
      currencies: ["ARS" as const],
      openingDebtMinor: noOpening,
    };

    // Act
    const summaries = summarizeStatements(input);

    // Assert
    expect(summaries.map((item) => item.id)).toEqual(["s1", "s2"]);
    expect(summaries[1]?.totals[0]).toMatchObject({
      previousBalanceMinor: 60_00,
      totalMinor: 90_00,
    });
  });

  it("starts the first statement with the opening debt of the card", () => {
    // Arrange
    const input = {
      statements: [row("s1", "2026-11")],
      lines: [line("s1", "own", 10_00)],
      currencies: ["ARS" as const],
      openingDebtMinor: { ARS: 500_00, USD: 0 },
    };

    // Act
    const [summary] = summarizeStatements(input);

    // Assert
    expect(summary?.totals[0]).toMatchObject({ previousBalanceMinor: 500_00, totalMinor: 510_00 });
  });

  it("keeps each currency apart", () => {
    // Arrange
    const input = {
      statements: [row("s1", "2026-11")],
      lines: [line("s1", "own", 10_00), line("s1", "own", 35_00, "USD")],
      currencies: ["ARS" as const, "USD" as const],
      openingDebtMinor: noOpening,
    };

    // Act
    const [summary] = summarizeStatements(input);

    // Assert
    expect(summary?.totals.map((item) => [item.currency, item.totalMinor])).toEqual([
      ["ARS", 10_00],
      ["USD", 35_00],
    ]);
  });

  it("reports the bank total, the minimum and the difference with the bank", () => {
    // Arrange
    const input = {
      statements: [
        row("s1", "2026-11", {
          bankTotalMinor: { ARS: 120_00, USD: null },
          minimumMinor: { ARS: 30_00, USD: null },
        }),
      ],
      lines: [line("s1", "own", 100_00)],
      currencies: ["ARS" as const, "USD" as const],
      openingDebtMinor: noOpening,
    };

    // Act
    const [summary] = summarizeStatements(input);

    // Assert
    expect(summary?.totals[0]).toMatchObject({
      bankTotalMinor: 120_00,
      minimumMinor: 30_00,
      differenceMinor: 20_00,
    });
    expect(summary?.totals[1]).toMatchObject({ bankTotalMinor: null, differenceMinor: null });
  });

  it("returns nothing for no statements", () => {
    // Arrange
    const input = {
      statements: [],
      lines: [],
      currencies: ["ARS" as const],
      openingDebtMinor: noOpening,
    };

    // Act
    const summaries = summarizeStatements(input);

    // Assert
    expect(summaries).toEqual([]);
  });
});

describe("checkStatementDates", () => {
  it("accepts a closing date inside the month and a later due date", () => {
    // Arrange
    const closing = "2026-11-25";

    // Act
    const violation = checkStatementDates("2026-11", closing, "2026-12-03");

    // Assert
    expect(violation).toBeNull();
  });

  it("rejects a closing date outside the month", () => {
    // Arrange
    const closing = "2026-12-01";

    // Act
    const violation = checkStatementDates("2026-11", closing, "2026-12-10");

    // Assert
    expect(violation).toBe("closing_outside_period");
  });

  it("rejects a due date that is not after the closing date", () => {
    // Arrange
    const closing = "2026-11-25";

    // Act
    const violation = checkStatementDates("2026-11", closing, closing);

    // Assert
    expect(violation).toBe("due_before_closing");
  });
});
