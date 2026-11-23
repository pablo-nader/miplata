import { describe, expect, it } from "vitest";
import {
  barPercent,
  chartBars,
  currentMonth,
  formatMonthLabel,
  formatPercentChange,
  formatShare,
  formatShortMonth,
} from "./report-view";

describe("currentMonth", () => {
  it("uses the local calendar month of the given date", () => {
    // Arrange
    const date = new Date(2026, 10, 30, 23, 30);

    // Act
    const month = currentMonth(date);

    // Assert
    expect(month).toBe("2026-11");
  });
});

describe("month labels", () => {
  it("names the month and year in the locale", () => {
    // Arrange
    const month = "2026-11";

    // Act
    const label = formatMonthLabel(month, "es-AR");

    // Assert
    expect(label.toLowerCase()).toContain("noviembre");
    expect(label).toContain("2026");
  });

  it("shortens the month for chart axes", () => {
    // Arrange
    const month = "2026-03";

    // Act
    const label = formatShortMonth(month, "en-US");

    // Assert
    expect(label).toBe("Mar");
  });
});

describe("barPercent", () => {
  it("scales against the largest value", () => {
    // Arrange
    const max = 200;

    // Act
    const result = [barPercent(200, max), barPercent(50, max), barPercent(0, max)];

    // Assert
    expect(result).toEqual([100, 25, 0]);
  });

  it("is zero when there is nothing to compare", () => {
    // Arrange
    const max = 0;

    // Act
    const result = barPercent(10, max);

    // Assert
    expect(result).toBe(0);
  });
});

describe("formatPercentChange", () => {
  it("shows a plus sign for increases with one decimal", () => {
    // Arrange
    const value = 25;

    // Act
    const text = formatPercentChange(value, "es-AR");

    // Assert
    expect(text).toBe("+25,0 %");
  });

  it("shows the typographic minus for decreases", () => {
    // Arrange
    const value = -12.5;

    // Act
    const text = formatPercentChange(value, "en-US");

    // Assert
    expect(text).toBe("−12.5 %");
  });

  it("shows no sign for zero", () => {
    // Arrange
    const value = 0;

    // Act
    const text = formatPercentChange(value, "en-US");

    // Assert
    expect(text).toBe("0.0 %");
  });
});

describe("chartBars", () => {
  const months = [
    { month: "2026-01", inMinor: 100, outMinor: 50, resultMinor: 50 },
    { month: "2026-02", inMinor: 0, outMinor: 200, resultMinor: -200 },
  ];
  const layout = { plotHeight: 100, slotWidth: 20, barWidth: 8, gap: 2 };

  it("gives the largest value the full plot height and anchors bars to the baseline", () => {
    // Arrange
    const input = months;

    // Act
    const bars = chartBars(input, layout);

    // Assert
    const tallest = bars.find((bar) => bar.month === "2026-02" && bar.kind === "out");
    expect(tallest?.height).toBe(100);
    expect(tallest?.y).toBe(0);
    expect(bars.find((bar) => bar.month === "2026-01" && bar.kind === "in")?.height).toBe(50);
  });

  it("keeps empty values as zero-height bars in their slot", () => {
    // Arrange
    const input = months;

    // Act
    const bars = chartBars(input, layout);

    // Assert
    const empty = bars.find((bar) => bar.month === "2026-02" && bar.kind === "in");
    expect(empty?.height).toBe(0);
    expect(empty?.x).toBe(21);
  });

  it("returns no bars without months", () => {
    // Arrange
    const input: typeof months = [];

    // Act
    const bars = chartBars(input, layout);

    // Assert
    expect(bars).toEqual([]);
  });
});

describe("formatShare", () => {
  it("keeps one decimal and drops a trailing zero", () => {
    // Arrange
    const values = [33.3, 0.4, 75, 0];

    // Act
    const result = values.map((value) => formatShare(value, "es-AR"));

    // Assert
    expect(result).toEqual(["33,3 %", "0,4 %", "75 %", "0 %"]);
  });
});
