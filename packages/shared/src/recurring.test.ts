import { describe, expect, it } from "vitest";
import {
  confirmOccurrenceRequestSchema,
  endRecurringRequestSchema,
  occurrenceQuerySchema,
  recurringRequestSchema,
} from "./recurring";

const ID = "00000000-0000-4000-8000-000000000001";

const base = {
  type: "expense",
  frequency: "monthly",
  dayOfMonth: 5,
  amountMode: "fixed",
  amountMinor: 1000,
  currency: "ARS",
  accountId: ID,
  categoryId: ID,
  startsOn: "2026-11-01",
};

describe("recurringRequestSchema", () => {
  it("accepts a fixed amount and normalizes empty optionals", () => {
    // Arrange
    const input = { ...base, description: "  " };

    // Act
    const parsed = recurringRequestSchema.parse(input);

    // Assert
    expect(parsed).toMatchObject({ description: null, endsOn: null, amountMinor: 1000 });
  });

  it("accepts a variable amount without a value", () => {
    // Arrange
    const input = { ...base, amountMode: "variable", amountMinor: undefined };

    // Act
    const result = recurringRequestSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(true);
  });

  it("rejects a fixed amount without a value", () => {
    // Arrange
    const input = { ...base, amountMinor: null };

    // Act
    const result = recurringRequestSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    // Arrange
    const input = { ...base, endsOn: "2026-10-31" };

    // Act
    const result = recurringRequestSchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejects an invalid day of month and an unknown frequency", () => {
    // Arrange
    const inputs = [
      { ...base, dayOfMonth: 32 },
      { ...base, frequency: "weekly" },
    ];

    // Act
    const results = inputs.map((input) => recurringRequestSchema.safeParse(input).success);

    // Assert
    expect(results).toEqual([false, false]);
  });
});

describe("occurrence request schemas", () => {
  it("accepts optional overrides and rejects non positive amounts", () => {
    // Arrange
    const valid = { amountMinor: 500, accountId: ID, occurredOn: "2026-11-05" };

    // Act
    const results = [
      confirmOccurrenceRequestSchema.safeParse(valid).success,
      confirmOccurrenceRequestSchema.safeParse({}).success,
      confirmOccurrenceRequestSchema.safeParse({ amountMinor: 0 }).success,
    ];

    // Assert
    expect(results).toEqual([true, true, false]);
  });

  it("validates the end date and the occurrence type filter", () => {
    // Arrange
    const results = [
      endRecurringRequestSchema.safeParse({ endsOn: "2026-12-31" }).success,
      endRecurringRequestSchema.safeParse({ endsOn: "2026-13-01" }).success,
      occurrenceQuerySchema.safeParse({ type: "income" }).success,
      occurrenceQuerySchema.safeParse({ type: "transfer" }).success,
    ];

    // Act
    const outcome = results;

    // Assert
    expect(outcome).toEqual([true, false, true, false]);
  });
});
