import { describe, expect, it } from "vitest";
import { monthlyInOut, percentChangeVsPreviousThree } from "./report-helpers";

describe("percentChangeVsPreviousThree", () => {
  it("is the difference against the average of the previous three months", () => {
    // Arrange
    const previous = [10000, 20000, 30000];

    // Act
    const result = percentChangeVsPreviousThree(25000, previous);

    // Assert
    expect(result).toBe(25);
  });

  it("is negative when spending dropped", () => {
    // Arrange
    const previous = [10000, 10000, 10000];

    // Act
    const result = percentChangeVsPreviousThree(7500, previous);

    // Assert
    expect(result).toBe(-25);
  });

  it("is zero when equal to the average", () => {
    // Arrange
    const previous = [100, 200, 300];

    // Act
    const result = percentChangeVsPreviousThree(200, previous);

    // Assert
    expect(result).toBe(0);
  });

  it("rounds to one decimal", () => {
    // Arrange
    const previous = [100, 100, 101];

    // Act
    const result = percentChangeVsPreviousThree(110, previous);

    // Assert
    expect(result).toBe(9.6);
  });

  it("rounds exact halves away from zero for both signs", () => {
    // Arrange
    const previous = [4000, 4000, 4000];

    // Act
    const rise = percentChangeVsPreviousThree(4010, previous);
    const drop = percentChangeVsPreviousThree(3990, previous);

    // Assert
    expect(rise).toBe(0.3);
    expect(drop).toBe(-0.3);
  });

  it("rejects negative amounts", () => {
    // Arrange
    const cases = [
      { current: -1, previous: [1, 2, 3] },
      { current: 1, previous: [-100, 0, 0] },
    ];

    // Act
    const acts = cases.map((c) => () => percentChangeVsPreviousThree(c.current, c.previous));

    // Assert
    for (const act of acts) expect(act).toThrow(RangeError);
  });

  it("counts a month without spending as zero in the average", () => {
    // Arrange
    const previous = [0, 0, 30000];

    // Act
    const result = percentChangeVsPreviousThree(20000, previous);

    // Assert
    expect(result).toBe(100);
  });

  it("has no baseline when the previous three months are all zero", () => {
    // Arrange
    const previous = [0, 0, 0];

    // Act
    const result = percentChangeVsPreviousThree(5000, previous);

    // Assert
    expect(result).toBeNull();
  });

  it("is minus one hundred percent when nothing was spent this month", () => {
    // Arrange
    const previous = [100, 100, 100];

    // Act
    const result = percentChangeVsPreviousThree(0, previous);

    // Assert
    expect(result).toBe(-100);
  });

  it("requires exactly three previous months", () => {
    // Arrange
    const previous = [1, 2];

    // Act
    const act = () => percentChangeVsPreviousThree(1, previous);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects non-integer amounts", () => {
    // Arrange
    const previous = [1, 2, 3];

    // Act
    const act = () => percentChangeVsPreviousThree(0.5, previous);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("monthlyInOut", () => {
  const installments = [
    { kind: "income", periodMonth: "2026-10", currency: "ARS", ownAmountMinor: 100000 },
    { kind: "expense", periodMonth: "2026-10", currency: "ARS", ownAmountMinor: 30000 },
    { kind: "expense", periodMonth: "2026-10", currency: "ARS", ownAmountMinor: 20000 },
    { kind: "expense", periodMonth: "2026-12", currency: "ARS", ownAmountMinor: 5000 },
    { kind: "expense", periodMonth: "2026-10", currency: "USD", ownAmountMinor: 777 },
    { kind: "income", periodMonth: "2027-05", currency: "ARS", ownAmountMinor: 1 },
  ] as const;

  it("totals in, out and result for each month of the range", () => {
    // Arrange
    const range = { from: "2026-10", to: "2026-12", currency: "ARS" } as const;

    // Act
    const result = monthlyInOut(installments, range);

    // Assert
    expect(result).toEqual([
      { month: "2026-10", inMinor: 100000, outMinor: 50000, resultMinor: 50000 },
      { month: "2026-11", inMinor: 0, outMinor: 0, resultMinor: 0 },
      { month: "2026-12", inMinor: 0, outMinor: 5000, resultMinor: -5000 },
    ]);
  });

  it("keeps currencies apart", () => {
    // Arrange
    const range = { from: "2026-10", to: "2026-10", currency: "USD" } as const;

    // Act
    const result = monthlyInOut(installments, range);

    // Assert
    expect(result).toEqual([{ month: "2026-10", inMinor: 0, outMinor: 777, resultMinor: -777 }]);
  });

  it("uses the own amount so other people's share is not counted", () => {
    // Arrange
    const rows = [
      { kind: "expense", periodMonth: "2026-10", currency: "ARS", ownAmountMinor: 400 },
    ] as const;
    const range = { from: "2026-10", to: "2026-10", currency: "ARS" } as const;

    // Act
    const result = monthlyInOut(rows, range);

    // Assert
    expect(result[0]?.outMinor).toBe(400);
  });

  it("rejects a result outside the safe integer range", () => {
    // Arrange
    const rows = [
      {
        kind: "income",
        periodMonth: "2026-10",
        currency: "ARS",
        ownAmountMinor: Number.MAX_SAFE_INTEGER,
      },
      { kind: "expense", periodMonth: "2026-10", currency: "ARS", ownAmountMinor: -5 },
    ] as const;
    const range = { from: "2026-10", to: "2026-10", currency: "ARS" } as const;

    // Act
    const act = () => monthlyInOut(rows, range);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("returns an empty list for a reversed range", () => {
    // Arrange
    const range = { from: "2026-12", to: "2026-10", currency: "ARS" } as const;

    // Act
    const result = monthlyInOut(installments, range);

    // Assert
    expect(result).toEqual([]);
  });
});
