import { describe, expect, it } from "vitest";
import { todayInArgentina } from "./today";

describe("todayInArgentina", () => {
  it("uses the Argentine calendar day, which is three hours behind UTC", () => {
    // Arrange
    const justAfterUtcMidnight = new Date("2026-12-01T01:30:00Z");

    // Act
    const today = todayInArgentina(justAfterUtcMidnight);

    // Assert
    expect(today).toBe("2026-11-30");
  });

  it("returns the same day when both calendars agree", () => {
    // Arrange
    const midday = new Date("2026-12-01T15:00:00Z");

    // Act
    const today = todayInArgentina(midday);

    // Assert
    expect(today).toBe("2026-12-01");
  });
});
