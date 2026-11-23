import { describe, expect, it } from "vitest";
import { budgetProgress, budgetSpent } from "./budget-progress";

describe("budgetProgress", () => {
  it("is below the threshold under 80%", () => {
    // Arrange
    const limit = 100000;

    // Act
    const result = budgetProgress(limit, 79999);

    // Assert
    expect(result).toEqual({
      limitMinor: 100000,
      spentMinor: 79999,
      remainingMinor: 20001,
      overspentMinor: 0,
      state: "below",
    });
  });

  it("warns from exactly 80%", () => {
    // Arrange
    const limit = 100000;

    // Act
    const result = budgetProgress(limit, 80000);

    // Assert
    expect(result.state).toBe("warning");
  });

  it("stays in warning just under 100%", () => {
    // Arrange
    const limit = 100000;

    // Act
    const result = budgetProgress(limit, 99999);

    // Assert
    expect(result.state).toBe("warning");
    expect(result.remainingMinor).toBe(1);
  });

  it("is reached at exactly 100%", () => {
    // Arrange
    const limit = 100000;

    // Act
    const result = budgetProgress(limit, 100000);

    // Assert
    expect(result).toMatchObject({ state: "reached", remainingMinor: 0, overspentMinor: 0 });
  });

  it("stays reached and reports the overspend above 100%", () => {
    // Arrange
    const limit = 100000;

    // Act
    const result = budgetProgress(limit, 130000);

    // Assert
    expect(result).toMatchObject({ state: "reached", remainingMinor: 0, overspentMinor: 30000 });
  });

  it("is below with nothing spent", () => {
    // Arrange
    const limit = 100000;

    // Act
    const result = budgetProgress(limit, 0);

    // Assert
    expect(result).toMatchObject({ state: "below", remainingMinor: 100000 });
  });

  it("treats a net negative spend (refunds) as nothing spent", () => {
    // Arrange
    const limit = 100000;

    // Act
    const result = budgetProgress(limit, -500);

    // Assert
    expect(result).toMatchObject({ spentMinor: 0, remainingMinor: 100000, state: "below" });
  });

  it("applies the 80% rule exactly with small limits", () => {
    // Arrange
    const limit = 5;

    // Act
    const states = [3, 4, 5].map((spent) => budgetProgress(limit, spent).state);

    // Assert
    expect(states).toEqual(["below", "warning", "reached"]);
  });

  it("does not overflow with very large amounts", () => {
    // Arrange
    const limit = 9007199254740000;

    // Act
    const result = budgetProgress(limit, 7205759403792000);

    // Assert
    expect(result.state).toBe("warning");
  });

  it.each([0, -1, 1.5])("rejects the limit %s", (limit) => {
    // Arrange
    const value = limit;

    // Act
    const act = () => budgetProgress(value, 0);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects a non-integer spend", () => {
    // Arrange
    const limit = 100;

    // Act
    const act = () => budgetProgress(limit, 0.5);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("budgetSpent", () => {
  const installments = [
    {
      kind: "expense",
      periodMonth: "2026-11",
      currency: "ARS",
      categoryId: "food",
      ownAmountMinor: 1000,
    },
    {
      kind: "expense",
      periodMonth: "2026-11",
      currency: "ARS",
      categoryId: "food",
      ownAmountMinor: 500,
    },
    {
      kind: "expense",
      periodMonth: "2026-11",
      currency: "ARS",
      categoryId: "fun",
      ownAmountMinor: 300,
    },
    {
      kind: "expense",
      periodMonth: "2026-12",
      currency: "ARS",
      categoryId: "food",
      ownAmountMinor: 700,
    },
    {
      kind: "expense",
      periodMonth: "2026-11",
      currency: "USD",
      categoryId: "food",
      ownAmountMinor: 900,
    },
    {
      kind: "income",
      periodMonth: "2026-11",
      currency: "ARS",
      categoryId: "salary",
      ownAmountMinor: 99999,
    },
  ] as const;

  it("sums only the user's own amount of expenses of the month, currency and categories", () => {
    // Arrange
    const filter = { periodMonth: "2026-11", currency: "ARS", categoryIds: ["food"] } as const;

    // Act
    const result = budgetSpent(installments, filter);

    // Assert
    expect(result).toBe(1500);
  });

  it("sums a whole group of categories", () => {
    // Arrange
    const filter = {
      periodMonth: "2026-11",
      currency: "ARS",
      categoryIds: ["food", "fun"],
    } as const;

    // Act
    const result = budgetSpent(installments, filter);

    // Assert
    expect(result).toBe(1800);
  });

  it("is zero when nothing matches", () => {
    // Arrange
    const filter = { periodMonth: "2027-01", currency: "ARS", categoryIds: ["food"] } as const;

    // Act
    const result = budgetSpent(installments, filter);

    // Assert
    expect(result).toBe(0);
  });

  it("ignores amounts owed by other people because only the own amount counts", () => {
    // Arrange
    const shared = [
      {
        kind: "expense",
        periodMonth: "2026-11",
        currency: "ARS",
        categoryId: "food",
        ownAmountMinor: 0,
      },
    ] as const;
    const filter = { periodMonth: "2026-11", currency: "ARS", categoryIds: ["food"] } as const;

    // Act
    const result = budgetSpent(shared, filter);

    // Assert
    expect(result).toBe(0);
  });
});
