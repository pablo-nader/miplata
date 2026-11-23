import { describe, expect, it } from "vitest";
import { prefillFromSearch } from "./movement-prefill";

const today = "2026-11-25";

describe("prefilling a movement from the address", () => {
  it("builds a transfer with the same amount and currency on both sides", () => {
    // Arrange
    const params = new URLSearchParams("type=transfer&from=juan&currency=USD&amountMinor=15050");

    // Act
    const form = prefillFromSearch(params, today);

    // Assert
    expect(form).toMatchObject({
      type: "transfer",
      date: today,
      fromAccountId: "juan",
      toAccountId: null,
      fromCurrency: "USD",
      toCurrency: "USD",
      fromAmount: "150.50",
      toAmount: "150.50",
    });
  });

  it("keeps the destination when only that side is given", () => {
    // Arrange
    const params = new URLSearchParams("type=transfer&to=ana&currency=ARS&amountMinor=300000");

    // Act
    const form = prefillFromSearch(params, today);

    // Assert
    expect(form).toMatchObject({ fromAccountId: null, toAccountId: "ana", fromAmount: "3000" });
  });

  it("ignores addresses that are not transfers", () => {
    // Arrange
    const params = new URLSearchParams("type=expense&currency=ARS&amountMinor=100");

    // Act
    const form = prefillFromSearch(params, today);

    // Assert
    expect(form).toBeNull();
  });

  it.each([
    "type=transfer&currency=EUR&amountMinor=100",
    "type=transfer&currency=ARS&amountMinor=abc",
    "type=transfer&currency=ARS&amountMinor=0",
    "type=transfer&currency=ARS",
  ])("leaves the amount empty for invalid values (%s)", (query) => {
    // Arrange
    const params = new URLSearchParams(query);

    // Act
    const form = prefillFromSearch(params, today);

    // Assert
    expect(form).toMatchObject({ fromAmount: "", toAmount: "" });
  });
});
