import { describe, expect, it } from "vitest";
import { type CommittedTemplate, recurringByMonth } from "./recurring-commitments";

const monthly = (overrides: Partial<CommittedTemplate> = {}): CommittedTemplate => ({
  recurringId: "r1",
  rule: {
    frequency: "monthly",
    dayOfMonth: 5,
    startsOn: "2026-01-05",
    endsOn: null,
    isPaused: false,
  },
  estimateMinor: 100_00,
  ...overrides,
});

describe("recurringByMonth", () => {
  it("adds the estimate for every due date in each month of the window", () => {
    // Arrange
    const templates = [monthly()];

    // Act
    const result = recurringByMonth(templates, [], "2026-12", "2027-02");

    // Assert
    expect([...result]).toEqual([
      ["2026-12", 100_00],
      ["2027-01", 100_00],
      ["2027-02", 100_00],
    ]);
  });

  it("skips occurrences already confirmed or skipped", () => {
    // Arrange
    const resolved = [{ recurringId: "r1", dueOn: "2027-01-05" }];

    // Act
    const result = recurringByMonth([monthly()], resolved, "2026-12", "2027-01");

    // Assert
    expect([...result]).toEqual([["2026-12", 100_00]]);
  });

  it("counts a bimonthly rule only in its months and a yearly rule once", () => {
    // Arrange
    const bimonthly = monthly({
      recurringId: "r2",
      rule: {
        frequency: "bimonthly",
        dayOfMonth: 10,
        startsOn: "2026-01-10",
        endsOn: null,
        isPaused: false,
      },
      estimateMinor: 50_00,
    });
    const yearly = monthly({
      recurringId: "r3",
      rule: {
        frequency: "yearly",
        monthOfYear: 3,
        dayOfMonth: 1,
        startsOn: "2026-03-01",
        endsOn: null,
        isPaused: false,
      },
      estimateMinor: 900_00,
    });

    // Act
    const result = recurringByMonth([bimonthly, yearly], [], "2026-12", "2027-03");

    // Assert
    expect([...result]).toEqual([
      ["2027-01", 50_00],
      ["2027-03", 50_00 + 900_00],
    ]);
  });

  it("ignores paused rules, ended rules and templates without an estimate", () => {
    // Arrange
    const paused = monthly({ rule: { ...monthly().rule, isPaused: true } });
    const ended = monthly({ rule: { ...monthly().rule, endsOn: "2026-12-31" } });
    const unknown = monthly({ estimateMinor: null });

    // Act
    const result = recurringByMonth([paused, ended, unknown], [], "2027-01", "2027-03");

    // Assert
    expect([...result]).toEqual([]);
  });
});
