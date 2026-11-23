import { describe, expect, it } from "vitest";
import { addDays, datesToGenerate, earlierOf } from "./generation";
import type { RecurringRule } from "./schedule";

const monthly: RecurringRule = {
  frequency: "monthly",
  dayOfMonth: 31,
  startsOn: "2026-01-01",
  endsOn: null,
  isPaused: false,
};

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    // Arrange
    const cases: [string, number, string][] = [
      ["2026-12-31", 1, "2027-01-01"],
      ["2028-02-28", 1, "2028-02-29"],
      ["2026-03-01", -1, "2026-02-28"],
    ];

    // Act
    const results = cases.map(([date, days]) => addDays(date, days));

    // Assert
    expect(results).toEqual(cases.map(([, , expected]) => expected));
  });
});

describe("datesToGenerate", () => {
  it("starts at the start date when nothing was generated", () => {
    // Arrange
    const latest = null;

    // Act
    const dates = datesToGenerate(monthly, latest, "2026-03-31");

    // Assert
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("continues after the latest generated date", () => {
    // Arrange
    const latest = "2026-02-28";

    // Act
    const dates = datesToGenerate(monthly, latest, "2026-04-30");

    // Assert
    expect(dates).toEqual(["2026-03-31", "2026-04-30"]);
  });

  it("returns nothing while paused", () => {
    // Arrange
    const paused = { ...monthly, isPaused: true };

    // Act
    const dates = datesToGenerate(paused, null, "2026-12-31");

    // Assert
    expect(dates).toEqual([]);
  });

  it("returns nothing when the latest date is already at the horizon", () => {
    // Arrange
    const latest = "2026-03-31";

    // Act
    const dates = datesToGenerate(monthly, latest, "2026-03-31");

    // Assert
    expect(dates).toEqual([]);
  });
});

describe("earlierOf", () => {
  it("picks the earlier date", () => {
    // Arrange
    const first = "2026-03-01";
    const second = "2026-02-28";

    // Act
    const earlier = earlierOf(first, second);

    // Assert
    expect(earlier).toBe(second);
  });
});
