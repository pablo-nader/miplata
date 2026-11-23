import { describe, expect, it } from "vitest";
import {
  bankFiguresRequestSchema,
  chargeRequestSchema,
  statementPaymentRequestSchema,
} from "./statements";

const id = "00000000-0000-4000-8000-000000000001";

describe("statement requests", () => {
  it("defaults a charge date and description to null", () => {
    // Arrange
    const body = { categoryId: id, currency: "ARS", amountMinor: 500 };

    // Act
    const parsed = chargeRequestSchema.parse(body);

    // Assert
    expect(parsed).toMatchObject({ occurredOn: null, description: null });
  });

  it("rejects a charge without a positive amount", () => {
    // Arrange
    const body = { categoryId: id, currency: "ARS", amountMinor: 0 };

    // Act
    const result = chargeRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(false);
  });

  it("defaults bank figures to null", () => {
    // Arrange
    const body = { bankTotalArsMinor: 100 };

    // Act
    const parsed = bankFiguresRequestSchema.parse(body);

    // Assert
    expect(parsed).toEqual({
      bankTotalArsMinor: 100,
      bankTotalUsdMinor: null,
      minimumArsMinor: null,
      minimumUsdMinor: null,
    });
  });

  it("requires some amount in a payment", () => {
    // Arrange
    const body = { fromAccountId: id, occurredOn: "2026-12-05" };

    // Act
    const result = statementPaymentRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(false);
  });

  it("requires the pesos spent when dollars are paid with pesos", () => {
    // Arrange
    const body = { fromAccountId: id, occurredOn: "2026-12-05", usdMinor: 3500, usdSource: "ars" };

    // Act
    const result = statementPaymentRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejects pesos spent when dollars are paid in dollars", () => {
    // Arrange
    const body = {
      fromAccountId: id,
      occurredOn: "2026-12-05",
      usdMinor: 3500,
      usdSourceAmountMinor: 4000,
    };

    // Act
    const result = statementPaymentRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(false);
  });

  it("accepts dollars paid with pesos", () => {
    // Arrange
    const body = {
      fromAccountId: id,
      occurredOn: "2026-12-05",
      usdMinor: 3500,
      usdSource: "ars",
      usdSourceAmountMinor: 4_305_000,
    };

    // Act
    const parsed = statementPaymentRequestSchema.parse(body);

    // Assert
    expect(parsed).toMatchObject({ arsMinor: 0, usdSource: "ars" });
  });
});
