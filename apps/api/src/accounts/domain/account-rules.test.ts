import type { Institution } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { type AccountDraft, normalizeAccount } from "./account-rules";

const galicia: Institution = { id: "inst-1", kind: "bank", name: "Galicia", logoPath: null };
const mercadoPago: Institution = {
  id: "inst-2",
  kind: "wallet",
  name: "Mercado Pago",
  logoPath: null,
};

function draft(overrides: Partial<AccountDraft> = {}): AccountDraft {
  return {
    type: "cash",
    institutionId: null,
    name: "Cash",
    closingDay: null,
    dueDay: null,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    ...overrides,
  };
}

describe("normalizeAccount", () => {
  it("accepts a named cash account", () => {
    // Arrange
    const input = draft();

    // Act
    const result = normalizeAccount(input, null);

    // Assert
    expect(result).toEqual({ ok: true, value: input });
  });

  it("uses the institution name when a bank has no custom name", () => {
    // Arrange
    const input = draft({ type: "bank", institutionId: "inst-1", name: null });

    // Act
    const result = normalizeAccount(input, galicia);

    // Assert
    expect(result).toEqual({ ok: true, value: { ...input, name: "Galicia" } });
  });

  it("keeps a custom name over the institution name", () => {
    // Arrange
    const input = draft({ type: "bank", institutionId: "inst-1", name: "Galicia salary" });

    // Act
    const result = normalizeAccount(input, galicia);

    // Assert
    expect(result).toMatchObject({ ok: true, value: { name: "Galicia salary" } });
  });

  it("requires a name when there is no institution", () => {
    // Arrange
    const input = draft({ name: null });

    // Act
    const result = normalizeAccount(input, null);

    // Assert
    expect(result).toEqual({ ok: false, violation: "name_required" });
  });

  it("allows an unnamed account when it keeps its translation key", () => {
    // Arrange
    const input = draft({ name: null });

    // Act
    const result = normalizeAccount(input, null, { keepsNameKey: true });

    // Assert
    expect(result).toMatchObject({ ok: true });
  });

  it("rejects an institution on cash and people", () => {
    // Arrange
    const cash = draft({ institutionId: "inst-1" });
    const person = draft({ type: "person", institutionId: "inst-1" });

    // Act
    const results = [normalizeAccount(cash, galicia), normalizeAccount(person, galicia)];

    // Assert
    expect(results).toEqual([
      { ok: false, violation: "institution_not_allowed" },
      { ok: false, violation: "institution_not_allowed" },
    ]);
  });

  it("rejects an institution that does not exist", () => {
    // Arrange
    const input = draft({ type: "bank", institutionId: "missing", name: null });

    // Act
    const result = normalizeAccount(input, null);

    // Assert
    expect(result).toEqual({ ok: false, violation: "institution_not_found" });
  });

  it("rejects a wallet institution on a bank account", () => {
    // Arrange
    const input = draft({ type: "bank", institutionId: "inst-2" });

    // Act
    const result = normalizeAccount(input, mercadoPago);

    // Assert
    expect(result).toEqual({ ok: false, violation: "institution_kind_mismatch" });
  });

  it("lets a credit card use a bank or wallet institution", () => {
    // Arrange
    const withBank = draft({ type: "credit_card", institutionId: "inst-1", name: null });
    const withWallet = draft({ type: "credit_card", institutionId: "inst-2", name: null });

    // Act
    const results = [
      normalizeAccount(withBank, galicia),
      normalizeAccount(withWallet, mercadoPago),
    ];

    // Assert
    expect(results.map((result) => result.ok)).toEqual([true, true]);
  });

  it("accepts closing and due days only on credit cards", () => {
    // Arrange
    const card = draft({ type: "credit_card", closingDay: 27, dueDay: 5 });
    const bank = draft({ type: "bank", institutionId: "inst-1", closingDay: 27 });

    // Act
    const results = [normalizeAccount(card, null), normalizeAccount(bank, galicia)];

    // Assert
    expect(results).toEqual([
      { ok: true, value: card },
      { ok: false, violation: "card_days_not_allowed" },
    ]);
  });

  it("rejects empty and duplicated currencies", () => {
    // Arrange
    const empty = draft({ currencies: [] });
    const duplicated = draft({
      currencies: [
        { currency: "ARS", openingBalanceMinor: 1 },
        { currency: "ARS", openingBalanceMinor: 2 },
      ],
    });

    // Act
    const results = [normalizeAccount(empty, null), normalizeAccount(duplicated, null)];

    // Assert
    expect(results).toEqual([
      { ok: false, violation: "currencies_invalid" },
      { ok: false, violation: "currencies_invalid" },
    ]);
  });
});
