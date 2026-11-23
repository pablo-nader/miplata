import { describe, expect, it } from "vitest";
import { dueDatesBetween, type RecurringRule } from "./schedule";

const monthly: RecurringRule = {
  frequency: "monthly",
  dayOfMonth: 15,
  startsOn: "2026-01-01",
  endsOn: null,
  isPaused: false,
};

describe("dueDatesBetween monthly", () => {
  it("lists one due date per month on the chosen day", () => {
    // Arrange
    const rule = monthly;

    // Act
    const result = dueDatesBetween(rule, "2026-03-01", "2026-05-31");

    // Assert
    expect(result).toEqual(["2026-03-15", "2026-04-15", "2026-05-15"]);
  });

  it("clamps day 31 to the last day of short months", () => {
    // Arrange
    const rule = { ...monthly, dayOfMonth: 31 };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-04-30");

    // Assert
    expect(result).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("clamps day 30 and 31 in a leap february", () => {
    // Arrange
    const rule = { ...monthly, dayOfMonth: 30 };

    // Act
    const result = dueDatesBetween(rule, "2028-02-01", "2028-02-29");

    // Assert
    expect(result).toEqual(["2028-02-29"]);
  });

  it("includes the window boundaries", () => {
    // Arrange
    const rule = monthly;

    // Act
    const result = dueDatesBetween(rule, "2026-03-15", "2026-04-15");

    // Assert
    expect(result).toEqual(["2026-03-15", "2026-04-15"]);
  });

  it("returns nothing when the window holds no due date", () => {
    // Arrange
    const rule = monthly;

    // Act
    const result = dueDatesBetween(rule, "2026-03-16", "2026-04-14");

    // Assert
    expect(result).toEqual([]);
  });

  it("returns nothing for a reversed window", () => {
    // Arrange
    const rule = monthly;

    // Act
    const result = dueDatesBetween(rule, "2026-05-01", "2026-03-01");

    // Assert
    expect(result).toEqual([]);
  });

  it("skips the start month when the day already passed", () => {
    // Arrange
    const rule = { ...monthly, startsOn: "2026-03-20" };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-05-31");

    // Assert
    expect(result).toEqual(["2026-04-15", "2026-05-15"]);
  });

  it("keeps the start date itself as a due date", () => {
    // Arrange
    const rule = { ...monthly, startsOn: "2026-03-15" };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-04-30");

    // Assert
    expect(result).toEqual(["2026-03-15", "2026-04-15"]);
  });

  it("stops at the end date inclusive", () => {
    // Arrange
    const rule = { ...monthly, endsOn: "2026-04-15" };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(result).toEqual(["2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15"]);
  });

  it("excludes a due date after the end date", () => {
    // Arrange
    const rule = { ...monthly, endsOn: "2026-04-14" };

    // Act
    const result = dueDatesBetween(rule, "2026-03-01", "2026-12-31");

    // Assert
    expect(result).toEqual(["2026-03-15"]);
  });

  it("returns nothing while paused", () => {
    // Arrange
    const rule = { ...monthly, isPaused: true };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(result).toEqual([]);
  });

  it("returns nothing for a window before the start", () => {
    // Arrange
    const rule = { ...monthly, startsOn: "2027-01-01" };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(result).toEqual([]);
  });
});

describe("dueDatesBetween bimonthly", () => {
  const bimonthly: RecurringRule = { ...monthly, frequency: "bimonthly", startsOn: "2026-01-10" };

  it("repeats every two months counted from the start month", () => {
    // Arrange
    const rule = bimonthly;

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(result).toEqual([
      "2026-01-15",
      "2026-03-15",
      "2026-05-15",
      "2026-07-15",
      "2026-09-15",
      "2026-11-15",
    ]);
  });

  it("keeps the cadence anchored on the start month when the window starts later", () => {
    // Arrange
    const rule = { ...bimonthly, startsOn: "2026-02-01" };

    // Act
    const result = dueDatesBetween(rule, "2026-05-01", "2026-09-30");

    // Assert
    expect(result).toEqual(["2026-06-15", "2026-08-15"]);
  });

  it("crosses the year boundary", () => {
    // Arrange
    const rule = { ...bimonthly, startsOn: "2026-11-01" };

    // Act
    const result = dueDatesBetween(rule, "2026-11-01", "2027-03-31");

    // Assert
    expect(result).toEqual(["2026-11-15", "2027-01-15", "2027-03-15"]);
  });

  it("clamps day 31 in short months", () => {
    // Arrange
    const rule = { ...bimonthly, dayOfMonth: 31, startsOn: "2026-02-01" };

    // Act
    const result = dueDatesBetween(rule, "2026-02-01", "2026-06-30");

    // Assert
    expect(result).toEqual(["2026-02-28", "2026-04-30", "2026-06-30"]);
  });

  it("starts the cadence after the start month when the first day already passed", () => {
    // Arrange
    const rule = { ...bimonthly, startsOn: "2026-01-20" };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-06-30");

    // Assert
    expect(result).toEqual(["2026-03-15", "2026-05-15"]);
  });
});

describe("dueDatesBetween yearly", () => {
  const yearly: RecurringRule = {
    frequency: "yearly",
    dayOfMonth: 10,
    monthOfYear: 3,
    startsOn: "2026-01-01",
    endsOn: null,
    isPaused: false,
  };

  it("lists one due date per year", () => {
    // Arrange
    const rule = yearly;

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2028-12-31");

    // Assert
    expect(result).toEqual(["2026-03-10", "2027-03-10", "2028-03-10"]);
  });

  it("clamps february 29 in non leap years", () => {
    // Arrange
    const rule = { ...yearly, dayOfMonth: 29, monthOfYear: 2 };

    // Act
    const result = dueDatesBetween(rule, "2027-01-01", "2028-12-31");

    // Assert
    expect(result).toEqual(["2027-02-28", "2028-02-29"]);
  });

  it("clamps day 31 in a thirty day month", () => {
    // Arrange
    const rule = { ...yearly, dayOfMonth: 31, monthOfYear: 4 };

    // Act
    const result = dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(result).toEqual(["2026-04-30"]);
  });

  it("respects start, end and pause", () => {
    // Arrange
    const started = { ...yearly, startsOn: "2027-03-11" };
    const ended = { ...yearly, endsOn: "2027-03-09" };
    const paused = { ...yearly, isPaused: true };

    // Act
    const results = [started, ended, paused].map((r) =>
      dueDatesBetween(r, "2026-01-01", "2029-12-31"),
    );

    // Assert
    expect(results).toEqual([["2028-03-10", "2029-03-10"], ["2026-03-10"], []]);
  });

  it("requires a month of year", () => {
    // Arrange
    const rule: RecurringRule = { ...yearly, monthOfYear: undefined };

    // Act
    const act = () => dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("dueDatesBetween validation", () => {
  it.each([0, 32, 1.5])("rejects the day of month %s", (dayOfMonth) => {
    // Arrange
    const rule = { ...monthly, dayOfMonth };

    // Act
    const act = () => dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects an end date before the start date", () => {
    // Arrange
    const rule = { ...monthly, endsOn: "2025-12-31" };

    // Act
    const act = () => dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(act).toThrow(RangeError);
  });

  it.each([0, 13, 1.5])("rejects the month of year %s for yearly rules", (monthOfYear) => {
    // Arrange
    const rule: RecurringRule = { ...monthly, frequency: "yearly", monthOfYear };

    // Act
    const act = () => dueDatesBetween(rule, "2026-01-01", "2026-12-31");

    // Assert
    expect(act).toThrow(RangeError);
  });
});
