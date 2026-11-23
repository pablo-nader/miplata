import type { StatementChargeLine, StatementTotals } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import {
  buildCharge,
  buildReconcile,
  chargeFormFrom,
  emptyChargeForm,
  reconcileFormFrom,
  units,
} from "./statement-forms";

describe("units", () => {
  it.each([
    [150_000, "1500"],
    [150_050, "1500,50"],
    [150_005, "1500,05"],
    [0, "0"],
  ])("writes %d minor units as %j", (minor, expected) => {
    // Arrange
    const amount = minor;

    // Act
    const text = units(amount);

    // Assert
    expect(text).toBe(expected);
  });
});

describe("buildCharge", () => {
  const valid = { ...emptyChargeForm("2026-11-27"), categoryId: "interest", amount: "36.600" };

  it("builds a request from the form", () => {
    // Arrange
    const form = { ...valid, description: "  Late payment  " };

    // Act
    const built = buildCharge(form);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        categoryId: "interest",
        currency: "ARS",
        amountMinor: 36_600_00,
        description: "Late payment",
        occurredOn: "2026-11-27",
      },
    });
  });

  it("sends a blank description as null", () => {
    // Arrange
    const form = { ...valid, description: "   " };

    // Act
    const built = buildCharge(form);

    // Assert
    expect(built).toMatchObject({ ok: true, value: { description: null } });
  });

  it("reports every missing or invalid field", () => {
    // Arrange
    const form = { ...emptyChargeForm("nope"), amount: "0" };

    // Act
    const built = buildCharge(form);

    // Assert
    expect(built).toEqual({ ok: false, errors: { category: true, amount: true, date: true } });
  });

  it("starts an edit from an existing charge", () => {
    // Arrange
    const line: StatementChargeLine = {
      movementId: "m",
      categoryId: "interest",
      description: null,
      occurredOn: "2026-11-20",
      currency: "USD",
      amountMinor: 12_50,
      isAdjustment: false,
    };

    // Act
    const form = chargeFormFrom(line);

    // Assert
    expect(form).toEqual({
      categoryId: "interest",
      currency: "USD",
      amount: "12,50",
      description: "",
      date: "2026-11-20",
    });
  });
});

describe("buildReconcile", () => {
  it("turns blank fields into null and typed fields into minor units", () => {
    // Arrange
    const form = { arsTotal: "504.900", arsMinimum: "", usdTotal: "35", usdMinimum: "" };

    // Act
    const built = buildReconcile(form);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        bankTotalArsMinor: 504_900_00,
        minimumArsMinor: null,
        bankTotalUsdMinor: 35_00,
        minimumUsdMinor: null,
      },
    });
  });

  it("flags the fields that cannot be read", () => {
    // Arrange
    const form = { arsTotal: "x", arsMinimum: "-1", usdTotal: "", usdMinimum: "" };

    // Act
    const built = buildReconcile(form);

    // Assert
    expect(built).toEqual({ ok: false, errors: { arsTotal: true, arsMinimum: true } });
  });

  it("fills the form from the stored figures", () => {
    // Arrange
    const ars = { bankTotalMinor: 130_00, minimumMinor: null } as StatementTotals;

    // Act
    const form = reconcileFormFrom(ars, undefined);

    // Assert
    expect(form).toEqual({ arsTotal: "130", arsMinimum: "", usdTotal: "", usdMinimum: "" });
  });
});
