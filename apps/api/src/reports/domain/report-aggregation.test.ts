import { describe, expect, it } from "vitest";
import {
  changesReport,
  committedReport,
  monthlyReport,
  sharePercent,
  spendingReport,
  type TotalRow,
} from "./report-aggregation";

const row = (
  month: string,
  categoryId: string,
  totalMinor: number,
  groupId: string | null = "g1",
  type: TotalRow["type"] = "expense",
): TotalRow => ({ month, type, categoryId, groupId, totalMinor });

describe("sharePercent", () => {
  it("rounds to one decimal and is zero without a total", () => {
    // Arrange
    const inputs = [
      [1, 3],
      [2, 3],
      [5, 0],
    ] as const;

    // Act
    const result = inputs.map(([part, total]) => sharePercent(part, total));

    // Assert
    expect(result).toEqual([33.3, 66.7, 0]);
  });
});

describe("spendingReport", () => {
  it("orders groups and categories largest first with their shares", () => {
    // Arrange
    const rows = [
      row("2026-11", "c1", 100_00, "g1"),
      row("2026-11", "c2", 300_00, "g2"),
      row("2026-11", "c3", 200_00, "g2"),
      row("2026-11", "c4", 400_00, "g2"),
    ];

    // Act
    const report = spendingReport(rows, "2026-11", "ARS");

    // Assert
    expect(report.totalMinor).toBe(1000_00);
    expect(report.groups.map((group) => [group.groupId, group.sharePercent])).toEqual([
      ["g2", 90],
      ["g1", 10],
    ]);
    expect(report.groups[0]?.categories.map((category) => category.categoryId)).toEqual([
      "c4",
      "c2",
      "c3",
    ]);
  });

  it("ignores income and other months", () => {
    // Arrange
    const rows = [
      row("2026-11", "c1", 100_00),
      row("2026-10", "c1", 900_00),
      row("2026-11", "salary", 5000_00, null, "income"),
    ];

    // Act
    const report = spendingReport(rows, "2026-11", "ARS");

    // Assert
    expect(report.totalMinor).toBe(100_00);
  });
});

describe("monthlyReport", () => {
  it("covers twelve months ending at the requested month with each result", () => {
    // Arrange
    const rows = [
      row("2026-11", "c1", 300_00),
      row("2026-11", "salary", 1000_00, null, "income"),
      row("2025-12", "c1", 50_00),
    ];

    // Act
    const report = monthlyReport(rows, "2026-11", "ARS");

    // Assert
    expect(report.months).toHaveLength(12);
    expect(report.months[0]).toMatchObject({
      month: "2025-12",
      outMinor: 50_00,
      resultMinor: -50_00,
    });
    expect(report.months[11]).toMatchObject({ month: "2026-11", resultMinor: 700_00 });
  });
});

describe("changesReport", () => {
  it("counts months without spending as zero in the three-month average", () => {
    // Arrange
    const rows = [row("2026-11", "c1", 200_00), row("2026-09", "c1", 300_00)];

    // Act
    const report = changesReport(rows, "2026-11", "ARS");

    // Assert
    expect(report.categories).toEqual([
      { categoryId: "c1", currentMinor: 200_00, previousAverageMinor: 100_00, percentChange: 100 },
    ]);
  });

  it("has no percentage when the previous three months are empty", () => {
    // Arrange
    const rows = [row("2026-11", "c1", 200_00), row("2026-07", "c1", 999_00)];

    // Act
    const report = changesReport(rows, "2026-11", "ARS");

    // Assert
    expect(report.categories[0]?.percentChange).toBeNull();
  });

  it("keeps a category that stopped spending at minus one hundred percent", () => {
    // Arrange
    const rows = [row("2026-10", "c1", 300_00)];

    // Act
    const report = changesReport(rows, "2026-11", "ARS");

    // Assert
    expect(report.categories[0]).toMatchObject({ currentMinor: 0, percentChange: -100 });
  });
});

describe("committedReport", () => {
  it("lists each coming month with installments plus recurring", () => {
    // Arrange
    const rows = [row("2026-12", "c1", 100_00), row("2027-02", "c1", 50_00)];
    const recurring = new Map([["2026-12", 25_00]]);

    // Act
    const report = committedReport(rows, recurring, "2026-12", 3, "ARS");

    // Assert
    expect(report.months).toEqual([
      { month: "2026-12", installmentsMinor: 100_00, recurringMinor: 25_00, totalMinor: 125_00 },
      { month: "2027-01", installmentsMinor: 0, recurringMinor: 0, totalMinor: 0 },
      { month: "2027-02", installmentsMinor: 50_00, recurringMinor: 0, totalMinor: 50_00 },
    ]);
  });
});
