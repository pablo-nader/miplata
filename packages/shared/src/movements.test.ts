import { describe, expect, it } from "vitest";
import {
  MAX_AMOUNT_MINOR,
  monthSummaryQuerySchema,
  movementQuerySchema,
  movementRequestSchema,
} from "./movements";

const id = "00000000-0000-4000-8000-000000000001";

const entry = {
  type: "expense",
  occurredOn: "2026-11-10",
  categoryId: id,
  accountId: id,
  currency: "ARS",
  amountMinor: 1000,
};

describe("movement requests", () => {
  it("defaults an entry to one installment and no person and trims the description", () => {
    // Arrange
    const body = { ...entry, description: "  Groceries  " };

    // Act
    const parsed = movementRequestSchema.parse(body);

    // Assert
    expect(parsed).toMatchObject({ installments: 1, person: null, description: "Groceries" });
  });

  it("turns a blank description into null", () => {
    // Arrange
    const body = { ...entry, description: "   " };

    // Act
    const parsed = movementRequestSchema.parse(body);

    // Assert
    expect(parsed).toMatchObject({ description: null });
  });

  it("accepts a transfer with two legs", () => {
    // Arrange
    const body = {
      type: "transfer",
      occurredOn: "2026-11-10",
      from: { accountId: id, currency: "ARS", amountMinor: 100 },
      to: { accountId: id, currency: "USD", amountMinor: 1 },
    };

    // Act
    const result = movementRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(true);
  });

  it.each([
    ["a fractional amount", { amountMinor: 1.5 }],
    ["an amount above the limit", { amountMinor: MAX_AMOUNT_MINOR + 1 }],
    ["zero installments", { installments: 0 }],
    ["sixty-one installments", { installments: 61 }],
    ["an impossible date", { occurredOn: "2026-02-30" }],
    ["a negative own share", { person: { personId: id, ownAmountMinor: -1 } }],
  ])("rejects %s", (_label, changes) => {
    // Arrange
    const body = { ...entry, ...changes };

    // Act
    const result = movementRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(false);
  });
});

describe("movement queries", () => {
  it("applies the default page", () => {
    // Arrange
    const query = {};

    // Act
    const parsed = movementQuerySchema.parse(query);

    // Assert
    expect(parsed).toMatchObject({ limit: 50, offset: 0 });
  });

  it("reads amounts from strings", () => {
    // Arrange
    const query = { minAmountMinor: "100", maxAmountMinor: "500" };

    // Act
    const parsed = movementQuerySchema.parse(query);

    // Assert
    expect(parsed).toMatchObject({ minAmountMinor: 100, maxAmountMinor: 500 });
  });

  it.each([
    { from: "2026-12-01", to: "2026-11-01" },
    { minAmountMinor: "10", maxAmountMinor: "5" },
    { minAmountMinor: "" },
    { minAmountMinor: "-1" },
    { limit: "0" },
    { offset: "100001" },
  ])("rejects %j", (query) => {
    // Arrange
    const input = query;

    // Act
    const result = movementQuerySchema.safeParse(input);

    // Assert
    expect(result.success).toBe(false);
  });

  it("requires a real month for the summary", () => {
    // Arrange
    const valid = { month: "2026-11" };
    const invalid = { month: "2026-13" };

    // Act
    const results = [valid, invalid].map((value) => monthSummaryQuerySchema.safeParse(value));

    // Assert
    expect(results.map((result) => result.success)).toEqual([true, false]);
  });
});
