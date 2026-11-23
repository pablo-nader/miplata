import { describe, expect, it } from "vitest";
import { buildBudgetRequest, emptyBudgetForm, formFromBudget } from "./budget-form";

const id = "00000000-0000-4000-8000-000000000001";

describe("buildBudgetRequest", () => {
  it("builds a category budget from a typed amount", () => {
    // Arrange
    const form = { ...emptyBudgetForm(), categoryId: id, limit: "1.500,50" };

    // Act
    const built = buildBudgetRequest(form);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: { categoryId: id, groupId: null, currency: "ARS", limitMinor: 150050 },
    });
  });

  it("builds a group budget in dollars", () => {
    // Arrange
    const form = {
      ...emptyBudgetForm(),
      kind: "group" as const,
      groupId: id,
      currency: "USD" as const,
      limit: "20",
    };

    // Act
    const built = buildBudgetRequest(form);

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: { groupId: id, categoryId: null, limitMinor: 2000 },
    });
  });

  it("ignores a category chosen before switching to groups", () => {
    // Arrange
    const form = { ...emptyBudgetForm(), kind: "group" as const, categoryId: id, limit: "10" };

    // Act
    const built = buildBudgetRequest(form);

    // Assert
    expect(built).toEqual({ ok: false, errors: { target: "targetRequired" } });
  });

  it("rejects a missing target and a zero, negative, huge or unreadable limit", () => {
    // Arrange
    const base = { ...emptyBudgetForm(), categoryId: id };
    const limits = ["", "0", "-5", "abc", "99999999999999"];

    // Act
    const results = limits.map((limit) => buildBudgetRequest({ ...base, limit }));
    const noTarget = buildBudgetRequest({ ...emptyBudgetForm(), limit: "10" });

    // Assert
    expect(results.every((result) => !result.ok && result.errors.limit === "limitInvalid")).toBe(
      true,
    );
    expect(noTarget).toEqual({ ok: false, errors: { target: "targetRequired" } });
  });
});

describe("formFromBudget", () => {
  it("restores the kind, target and limit text", () => {
    // Arrange
    const budget = {
      id,
      categoryId: null,
      groupId: id,
      currency: "USD" as const,
      limitMinor: 12550,
    };

    // Act
    const form = formFromBudget(budget);

    // Assert
    expect(form).toEqual({
      kind: "group",
      categoryId: null,
      groupId: id,
      currency: "USD",
      limit: "125.5",
    });
  });
});
