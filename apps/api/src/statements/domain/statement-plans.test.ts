import type { Account, CategoryDto, ChargeRequest, StatementPaymentRequest } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { planCharge, planPayment } from "./statement-plans";

const CARD = "00000000-0000-4000-8000-000000000002";
const BANK = "00000000-0000-4000-8000-000000000004";
const JUAN = "00000000-0000-4000-8000-000000000003";
const GROUP = "00000000-0000-4000-8000-000000000010";
const CATEGORY = "00000000-0000-4000-8000-000000000009";

function account(overrides: Partial<Account> & { id: string; type: Account["type"] }): Account {
  return {
    name: "Account",
    nameKey: null,
    institution: null,
    closingDay: 27,
    dueDay: 5,
    isActive: true,
    canDelete: true,
    currencies: [
      { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 },
      { currency: "USD", openingBalanceMinor: 0, balanceMinor: 0 },
    ],
    ...overrides,
  };
}

const card = account({ id: CARD, type: "credit_card" });
const bank = account({ id: BANK, type: "bank" });
const arsOnlyBank = account({
  id: BANK,
  type: "bank",
  currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 }],
});

const category: CategoryDto = {
  id: CATEGORY,
  type: "expense",
  groupId: GROUP,
  nameKey: "defaults.category.interest",
  name: null,
  icon: null,
  color: 1,
  isActive: true,
  sortOrder: 0,
};

const statement = { id: "s1", periodMonth: "2026-11", closingDate: "2026-11-27" };

function charge(overrides: Partial<ChargeRequest> = {}): ChargeRequest {
  return {
    categoryId: CATEGORY,
    currency: "ARS",
    amountMinor: 36_600_00,
    description: null,
    occurredOn: null,
    ...overrides,
  };
}

function refs(overrides: Partial<Parameters<typeof planCharge>[2]> = {}) {
  return { card, category, financialGroupId: GROUP, keepInactive: new Set<string>(), ...overrides };
}

describe("planCharge", () => {
  it("plans an expense forced into the statement and counted in its month", () => {
    // Arrange
    const request = charge();

    // Act
    const outcome = planCharge(statement, request, refs());

    // Assert
    expect(outcome).toMatchObject({
      ok: true,
      plan: {
        type: "expense",
        occurredOn: "2026-11-27",
        statementId: "s1",
        postings: [{ accountId: CARD, currency: "ARS", amountMinor: -36_600_00 }],
        installments: [{ number: 1, periodMonth: "2026-11", ownAmountMinor: 36_600_00 }],
      },
    });
  });

  it("keeps a date chosen by the user", () => {
    // Arrange
    const request = charge({ occurredOn: "2026-11-20" });

    // Act
    const outcome = planCharge(statement, request, refs());

    // Assert
    expect(outcome).toMatchObject({ ok: true, plan: { occurredOn: "2026-11-20" } });
  });

  it.each([
    ["a category outside the financial charges group", { category: { ...category, groupId: "x" } }],
    ["an income category", { category: { ...category, type: "income" as const } }],
    ["a missing financial charges group", { financialGroupId: null }],
  ])("rejects %s", (_label, overrides) => {
    // Arrange
    const references = refs(overrides);

    // Act
    const outcome = planCharge(statement, charge(), references);

    // Assert
    expect(outcome).toEqual({ ok: false, violation: "category_not_allowed" });
  });

  it("rejects an inactive category", () => {
    // Arrange
    const inactiveCategory = refs({ category: { ...category, isActive: false } });

    // Act
    const outcome = planCharge(statement, charge(), inactiveCategory);

    // Assert
    expect(outcome).toEqual({ ok: false, violation: "category_inactive" });
  });

  it("accepts a charge on a deactivated card so its debt stays reconcilable", () => {
    // Arrange
    const inactiveCard = refs({ card: { ...card, isActive: false } });

    // Act
    const outcome = planCharge(statement, charge(), inactiveCard);

    // Assert
    expect(outcome.ok).toBe(true);
  });

  it("allows an edit to keep an inactive category", () => {
    // Arrange
    const references = refs({
      category: { ...category, isActive: false },
      keepInactive: new Set([CATEGORY]),
    });

    // Act
    const outcome = planCharge(statement, charge(), references);

    // Assert
    expect(outcome.ok).toBe(true);
  });

  it("rejects a currency the card does not hold", () => {
    // Arrange
    const pesosOnly = account({
      id: CARD,
      type: "credit_card",
      currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 }],
    });

    // Act
    const outcome = planCharge(statement, charge({ currency: "USD" }), refs({ card: pesosOnly }));

    // Assert
    expect(outcome).toEqual({ ok: false, violation: "currency_not_in_account" });
  });
});

function payment(overrides: Partial<StatementPaymentRequest> = {}): StatementPaymentRequest {
  return {
    fromAccountId: BANK,
    occurredOn: "2026-12-05",
    arsMinor: 504_900_00,
    usdMinor: 0,
    usdSource: "usd",
    usdSourceAmountMinor: null,
    ...overrides,
  };
}

describe("planPayment", () => {
  it("plans a transfer in pesos linked to the statement", () => {
    // Arrange
    const request = payment();

    // Act
    const outcome = planPayment(statement, request, { card, source: bank });

    // Assert
    expect(outcome).toMatchObject({
      ok: true,
      plans: [
        {
          type: "transfer",
          statementId: "s1",
          postings: [
            { accountId: BANK, currency: "ARS", amountMinor: -504_900_00 },
            { accountId: CARD, currency: "ARS", amountMinor: 504_900_00 },
          ],
        },
      ],
    });
  });

  it("plans a second transfer for the dollar part paid in dollars", () => {
    // Arrange
    const request = payment({ usdMinor: 35_00 });

    // Act
    const outcome = planPayment(statement, request, { card, source: bank });

    // Assert
    expect(outcome.ok && outcome.plans.map((plan) => plan.postings.map((p) => p.currency))).toEqual(
      [
        ["ARS", "ARS"],
        ["USD", "USD"],
      ],
    );
  });

  it("plans the dollar part as an exchange from pesos", () => {
    // Arrange
    const request = payment({
      arsMinor: 0,
      usdMinor: 35_00,
      usdSource: "ars",
      usdSourceAmountMinor: 43_050_00,
    });

    // Act
    const outcome = planPayment(statement, request, { card, source: bank });

    // Assert
    expect(outcome).toMatchObject({
      ok: true,
      plans: [
        {
          postings: [
            { accountId: BANK, currency: "ARS", amountMinor: -43_050_00 },
            { accountId: CARD, currency: "USD", amountMinor: 35_00 },
          ],
        },
      ],
    });
  });

  it("accepts paying a deactivated card but not from a deactivated account", () => {
    // Arrange
    const inactiveCard = { ...card, isActive: false };
    const inactiveSource = { ...bank, isActive: false };

    // Act
    const toCard = planPayment(statement, payment(), { card: inactiveCard, source: bank });
    const fromAccount = planPayment(statement, payment(), { card, source: inactiveSource });

    // Assert
    expect(toCard.ok).toBe(true);
    expect(fromAccount).toEqual({ ok: false, violation: "account_inactive" });
  });

  it("rejects paying from a person or another card", () => {
    // Arrange
    const person = account({ id: JUAN, type: "person" });
    const otherCard = account({ id: BANK, type: "credit_card" });

    // Act
    const byPerson = planPayment(statement, payment(), { card, source: person });
    const byCard = planPayment(statement, payment(), { card, source: otherCard });

    // Assert
    expect(byPerson).toEqual({ ok: false, violation: "account_not_allowed" });
    expect(byCard).toEqual({ ok: false, violation: "account_not_allowed" });
  });

  it("rejects a source account that lacks the currency", () => {
    // Arrange
    const request = payment({ arsMinor: 0, usdMinor: 35_00 });

    // Act
    const outcome = planPayment(statement, request, { card, source: arsOnlyBank });

    // Assert
    expect(outcome).toEqual({ ok: false, violation: "currency_not_in_account" });
  });
});
