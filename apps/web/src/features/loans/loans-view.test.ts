import { describe, expect, it } from "vitest";
import { forgivenessCategoryType, repaymentPath } from "./loans-view";

describe("repayment path", () => {
  it("sends the money from the person when they owe the user", () => {
    // Arrange
    const line = { currency: "ARS", amountMinor: 70_000 } as const;

    // Act
    const path = repaymentPath("juan", "owesYou", line);

    // Assert
    expect(path).toBe("/movements/new?type=transfer&from=juan&currency=ARS&amountMinor=70000");
  });

  it("sends the money to the person when the user owes them", () => {
    // Arrange
    const line = { currency: "USD", amountMinor: 5_000 } as const;

    // Act
    const path = repaymentPath("ana", "youOwe", line);

    // Assert
    expect(path).toBe("/movements/new?type=transfer&to=ana&currency=USD&amountMinor=5000");
  });
});

describe("forgiveness category type", () => {
  it("is an expense when the person owes the user and an income otherwise", () => {
    // Arrange
    const directions = ["owesYou", "youOwe"] as const;

    // Act
    const types = directions.map(forgivenessCategoryType);

    // Assert
    expect(types).toEqual(["expense", "income"]);
  });
});
