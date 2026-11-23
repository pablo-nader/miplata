import { describe, expect, it } from "vitest";
import { allocateOwnShare, splitIntoInstallments, splitPurchase } from "./installments";

describe("splitIntoInstallments", () => {
  it("splits evenly when the total divides exactly", () => {
    // Arrange
    const total = 90000000;

    // Act
    const result = splitIntoInstallments(total, 3);

    // Assert
    expect(result).toEqual([30000000, 30000000, 30000000]);
  });

  it("puts the rounding difference on the first installment", () => {
    // Arrange
    const total = 10000;

    // Act
    const result = splitIntoInstallments(total, 3);

    // Assert
    expect(result).toEqual([3334, 3333, 3333]);
  });

  it("returns the whole total for a single payment", () => {
    // Arrange
    const total = 4830000;

    // Act
    const result = splitIntoInstallments(total, 1);

    // Assert
    expect(result).toEqual([4830000]);
  });

  it("keeps the sum equal to the total for many shapes", () => {
    // Arrange
    const totals = [7, 100, 999, 123457, 9007199254740990];
    const counts = [1, 2, 3, 6, 7, 12, 18, 24];

    // Act
    const sums = totals.flatMap((total) =>
      counts
        .filter((count) => total >= count)
        .map((count) => {
          const parts = splitIntoInstallments(total, count);
          return { total, sum: parts.reduce((a, b) => a + b, 0), min: Math.min(...parts) };
        }),
    );

    // Assert
    for (const entry of sums) {
      expect(entry.sum).toBe(entry.total);
      expect(entry.min).toBeGreaterThan(0);
    }
  });

  it("never gives a later installment more than the first", () => {
    // Arrange
    const total = 100001;

    // Act
    const [first, ...rest] = splitIntoInstallments(total, 7);

    // Assert
    for (const part of rest) expect(part).toBeLessThanOrEqual(first as number);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects the installment count %s", (count) => {
    // Arrange
    const total = 1000;

    // Act
    const act = () => splitIntoInstallments(total, count);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it.each([0, -100, 10.5, Number.NaN])("rejects the total %s", (total) => {
    // Arrange
    const count = 2;

    // Act
    const act = () => splitIntoInstallments(total, count);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects a total smaller than the number of installments", () => {
    // Arrange
    const total = 2;

    // Act
    const act = () => splitIntoInstallments(total, 3);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("allocateOwnShare", () => {
  it("gives the user everything when the whole purchase is theirs", () => {
    // Arrange
    const installments = [3334, 3333, 3333];

    // Act
    const result = allocateOwnShare(installments, 10000);

    // Assert
    expect(result).toEqual([
      { amountMinor: 3334, ownAmountMinor: 3334, owedMinor: 0 },
      { amountMinor: 3333, ownAmountMinor: 3333, owedMinor: 0 },
      { amountMinor: 3333, ownAmountMinor: 3333, owedMinor: 0 },
    ]);
  });

  it("gives the user nothing when the purchase is for another person", () => {
    // Arrange
    const installments = [3334, 3333, 3333];

    // Act
    const result = allocateOwnShare(installments, 0);

    // Assert
    expect(result.map((r) => [r.ownAmountMinor, r.owedMinor])).toEqual([
      [0, 3334],
      [0, 3333],
      [0, 3333],
    ]);
  });

  it("splits a shared purchase in half", () => {
    // Arrange
    const installments = [40000, 40000];

    // Act
    const result = allocateOwnShare(installments, 40000);

    // Assert
    expect(result.map((r) => [r.ownAmountMinor, r.owedMinor])).toEqual([
      [20000, 20000],
      [20000, 20000],
    ]);
  });

  it("distributes the leftover cents to the largest remainders, earliest first", () => {
    // Arrange
    const installments = [5, 5, 5];

    // Act
    const result = allocateOwnShare(installments, 1);

    // Assert
    expect(result.map((r) => r.ownAmountMinor)).toEqual([1, 0, 0]);
  });

  it("keeps own amounts summing to the requested own total and within each installment", () => {
    // Arrange
    const installments = [3334, 3333, 3333, 3333, 3333, 3334 - 1];
    const total = installments.reduce((a, b) => a + b, 0);
    const owns = [0, 1, 7, 1234, Math.floor(total / 3), total - 1, total];

    // Act
    const results = owns.map((own) => ({ own, parts: allocateOwnShare(installments, own) }));

    // Assert
    for (const { own, parts } of results) {
      expect(parts.reduce((a, p) => a + p.ownAmountMinor, 0)).toBe(own);
      for (const part of parts) {
        expect(part.ownAmountMinor).toBeGreaterThanOrEqual(0);
        expect(part.ownAmountMinor).toBeLessThanOrEqual(part.amountMinor);
        expect(part.ownAmountMinor + part.owedMinor).toBe(part.amountMinor);
      }
    }
  });

  it("handles totals whose products exceed the safe integer range", () => {
    // Arrange
    const installments = [4503599627370496, 4503599627370495];

    // Act
    const result = allocateOwnShare(installments, 4503599627370496);

    // Assert
    expect(result.reduce((a, p) => a + p.ownAmountMinor, 0)).toBe(4503599627370496);
  });

  it("rejects an own total above the purchase total or negative", () => {
    // Arrange
    const installments = [100, 100];

    // Act
    const acts = [-1, 201, 1.5].map((own) => () => allocateOwnShare(installments, own));

    // Assert
    for (const act of acts) expect(act).toThrow(RangeError);
  });

  it("rejects an empty list", () => {
    // Arrange
    const installments: number[] = [];

    // Act
    const act = () => allocateOwnShare(installments, 0);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("splitPurchase", () => {
  it("splits an own purchase", () => {
    // Arrange
    const share = { kind: "own" } as const;

    // Act
    const result = splitPurchase(90000000, 3, share);

    // Assert
    expect(result.map((r) => [r.amountMinor, r.ownAmountMinor])).toEqual([
      [30000000, 30000000],
      [30000000, 30000000],
      [30000000, 30000000],
    ]);
  });

  it("splits a purchase for another person", () => {
    // Arrange
    const share = { kind: "forOther" } as const;

    // Act
    const result = splitPurchase(10000, 3, share);

    // Assert
    expect(result.map((r) => [r.amountMinor, r.ownAmountMinor, r.owedMinor])).toEqual([
      [3334, 0, 3334],
      [3333, 0, 3333],
      [3333, 0, 3333],
    ]);
  });

  it("splits a shared purchase using the user's total share", () => {
    // Arrange
    const share = { kind: "shared", ownMinor: 80000 } as const;

    // Act
    const result = splitPurchase(160000, 2, share);

    // Assert
    expect(result.map((r) => [r.ownAmountMinor, r.owedMinor])).toEqual([
      [40000, 40000],
      [40000, 40000],
    ]);
  });
});
