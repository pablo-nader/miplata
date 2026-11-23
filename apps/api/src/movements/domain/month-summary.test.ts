import { describe, expect, it } from "vitest";
import { monthTotals } from "./month-summary";

describe("month totals", () => {
  it("always reports both currencies, even with no rows", () => {
    // Arrange
    const rows = [] as const;

    // Act
    const totals = monthTotals(rows);

    // Assert
    expect(totals).toEqual([
      { currency: "ARS", inMinor: 0, outMinor: 0 },
      { currency: "USD", inMinor: 0, outMinor: 0 },
    ]);
  });

  it("keeps each currency and direction apart", () => {
    // Arrange
    const rows = [
      { currency: "ARS", type: "income", totalMinor: 1000 },
      { currency: "ARS", type: "expense", totalMinor: 400 },
      { currency: "USD", type: "expense", totalMinor: 25 },
    ] as const;

    // Act
    const totals = monthTotals(rows);

    // Assert
    expect(totals).toEqual([
      { currency: "ARS", inMinor: 1000, outMinor: 400 },
      { currency: "USD", inMinor: 0, outMinor: 25 },
    ]);
  });
});
