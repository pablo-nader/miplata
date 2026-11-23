import { describe, expect, it } from "vitest";
import { budgetRequestSchema, budgetsQuerySchema } from "./budgets";

const id = "00000000-0000-4000-8000-000000000001";

describe("budget requests", () => {
  it("accepts a category budget and fills the group with null", () => {
    // Arrange
    const body = { categoryId: id, currency: "ARS", limitMinor: 1000 };

    // Act
    const parsed = budgetRequestSchema.parse(body);

    // Assert
    expect(parsed).toEqual({ categoryId: id, groupId: null, currency: "ARS", limitMinor: 1000 });
  });

  it("accepts a group budget", () => {
    // Arrange
    const body = { groupId: id, currency: "USD", limitMinor: 5 };

    // Act
    const parsed = budgetRequestSchema.parse(body);

    // Assert
    expect(parsed).toMatchObject({ groupId: id, categoryId: null });
  });

  it("rejects both targets, none, and non positive limits", () => {
    // Arrange
    const bad = [
      { categoryId: id, groupId: id, currency: "ARS", limitMinor: 1 },
      { currency: "ARS", limitMinor: 1 },
      { categoryId: id, currency: "ARS", limitMinor: 0 },
      { categoryId: id, currency: "EUR", limitMinor: 1 },
    ];

    // Act
    const results = bad.map((body) => budgetRequestSchema.safeParse(body).success);

    // Assert
    expect(results).toEqual([false, false, false, false]);
  });
});

describe("budget queries", () => {
  it("defaults attention to false and parses it", () => {
    // Arrange
    const plain = { month: "2026-11" };
    const flagged = { month: "2026-11", attention: "true" };

    // Act
    const results = [budgetsQuerySchema.parse(plain), budgetsQuerySchema.parse(flagged)];

    // Assert
    expect(results.map((query) => query.attention)).toEqual([false, true]);
  });

  it("rejects a malformed month", () => {
    // Arrange
    const query = { month: "2026-13" };

    // Act
    const parsed = budgetsQuerySchema.safeParse(query);

    // Assert
    expect(parsed.success).toBe(false);
  });
});
