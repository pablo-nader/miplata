import type { Account, CategoryDto, EntryRequest, TransferRequest } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { type EntryReferences, type MovementPlan, planEntry, planTransfer } from "./movement-plan";

const CASH = "00000000-0000-4000-8000-000000000001";
const VISA = "00000000-0000-4000-8000-000000000002";
const JUAN = "00000000-0000-4000-8000-000000000003";
const BANK = "00000000-0000-4000-8000-000000000004";
const CATEGORY = "00000000-0000-4000-8000-000000000009";

function account(overrides: Partial<Account> & { id: string; type: Account["type"] }): Account {
  return {
    name: "Account",
    nameKey: null,
    institution: null,
    closingDay: null,
    dueDay: null,
    isActive: true,
    canDelete: true,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 }],
    ...overrides,
  };
}

const cash = account({ id: CASH, type: "cash" });
const visa = account({ id: VISA, type: "credit_card", closingDay: 20, dueDay: 5 });
const juan = account({ id: JUAN, type: "person" });
const bank = account({
  id: BANK,
  type: "bank",
  currencies: [
    { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 },
    { currency: "USD", openingBalanceMinor: 0, balanceMinor: 0 },
  ],
});

const expenseCategory: CategoryDto = {
  id: CATEGORY,
  type: "expense",
  groupId: null,
  nameKey: null,
  name: "Food",
  icon: null,
  color: 1,
  isActive: true,
  sortOrder: 0,
};

function refs(overrides: Partial<EntryReferences> = {}): EntryReferences {
  return {
    account: cash,
    person: null,
    category: expenseCategory,
    keepInactive: new Set(),
    ...overrides,
  };
}

function entry(overrides: Partial<EntryRequest> = {}): EntryRequest {
  return {
    type: "expense",
    occurredOn: "2026-11-10",
    description: null,
    categoryId: CATEGORY,
    accountId: CASH,
    currency: "ARS",
    amountMinor: 900_00,
    installments: 1,
    person: null,
    ...overrides,
  };
}

function planOf(outcome: ReturnType<typeof planEntry>): MovementPlan {
  if (!outcome.ok) {
    throw new Error(`Expected a plan, got ${outcome.violation}`);
  }
  return outcome.plan;
}

describe("planning an entry", () => {
  it("posts a cash expense as one negative posting and one installment in the movement month", () => {
    // Arrange
    const request = entry();

    // Act
    const plan = planOf(planEntry(request, refs(), {}));

    // Assert
    expect(plan.postings).toEqual([{ accountId: CASH, currency: "ARS", amountMinor: -900_00 }]);
    expect(plan.installments).toEqual([
      {
        number: 1,
        periodMonth: "2026-11",
        currency: "ARS",
        amountMinor: 900_00,
        ownAmountMinor: 900_00,
      },
    ]);
    expect(plan.statementPlan).toBeNull();
  });

  it("posts an income as a positive posting", () => {
    // Arrange
    const request = entry({ type: "income" });
    const income = { ...expenseCategory, type: "income" as const };

    // Act
    const plan = planOf(planEntry(request, refs({ category: income }), {}));

    // Assert
    expect(plan.postings[0]?.amountMinor).toBe(900_00);
  });

  it("splits a card purchase into installments across statements", () => {
    // Arrange
    const request = entry({ accountId: VISA, installments: 3, occurredOn: "2026-11-25" });

    // Act
    const plan = planOf(planEntry(request, refs({ account: visa }), {}));

    // Assert
    expect(plan.installments.map((item) => item.periodMonth)).toEqual([
      "2026-12",
      "2027-01",
      "2027-02",
    ]);
    expect(plan.installments.map((item) => item.amountMinor)).toEqual([300_00, 300_00, 300_00]);
    expect(plan.statementPlan?.accountId).toBe(VISA);
    expect(plan.statementPlan?.statements).toHaveLength(3);
  });

  it("keeps a purchase on the closing date in the current statement", () => {
    // Arrange
    const request = entry({ accountId: VISA, occurredOn: "2026-11-20" });

    // Act
    const plan = planOf(planEntry(request, refs({ account: visa }), {}));

    // Assert
    expect(plan.installments[0]?.periodMonth).toBe("2026-11");
  });

  it("honours a corrected statement closing date", () => {
    // Arrange
    const request = entry({ accountId: VISA, occurredOn: "2026-11-22" });
    const overrides = { "2026-11": { closingDate: "2026-11-24", dueDate: "2026-12-03" } };

    // Act
    const plan = planOf(planEntry(request, refs({ account: visa }), overrides));

    // Assert
    expect(plan.installments[0]?.periodMonth).toBe("2026-11");
  });

  it("posts the other person's part and keeps only the user's share", () => {
    // Arrange
    const request = entry({
      accountId: VISA,
      amountMinor: 160_00,
      installments: 2,
      person: { personId: JUAN, ownAmountMinor: 80_00 },
    });

    // Act
    const plan = planOf(planEntry(request, refs({ account: visa, person: juan }), {}));

    // Assert
    expect(plan.postings).toEqual([
      { accountId: VISA, currency: "ARS", amountMinor: -160_00 },
      { accountId: JUAN, currency: "ARS", amountMinor: 80_00 },
    ]);
    expect(plan.installments.map((item) => item.ownAmountMinor)).toEqual([40_00, 40_00]);
  });

  it("owes the whole purchase to the person when nothing is the user's", () => {
    // Arrange
    const request = entry({ person: { personId: JUAN, ownAmountMinor: 0 } });

    // Act
    const plan = planOf(planEntry(request, refs({ person: juan }), {}));

    // Assert
    expect(plan.postings[1]?.amountMinor).toBe(900_00);
    expect(plan.installments[0]?.ownAmountMinor).toBe(0);
  });

  it.each([
    [
      "a category of the other type",
      { category: { ...expenseCategory, type: "income" as const } },
      {},
      "category_type_mismatch",
    ],
    [
      "an inactive category",
      { category: { ...expenseCategory, isActive: false } },
      {},
      "category_inactive",
    ],
    ["a person as the paying account", { account: juan }, {}, "account_not_allowed"],
    ["an inactive account", { account: { ...cash, isActive: false } }, {}, "account_inactive"],
    [
      "a currency the account does not hold",
      {},
      { currency: "USD" as const },
      "currency_not_in_account",
    ],
    ["installments on cash", {}, { installments: 2 }, "installments_not_allowed"],
    [
      "a card without closing and due days",
      { account: { ...visa, closingDay: null } },
      {},
      "card_without_schedule",
    ],
    [
      "fewer minor units than installments",
      { account: visa },
      { amountMinor: 2, installments: 3 },
      "amount_too_small",
    ],
    [
      "a person on an income",
      { category: { ...expenseCategory, type: "income" as const }, person: juan },
      { type: "income" as const, person: { personId: JUAN, ownAmountMinor: 0 } },
      "person_not_allowed",
    ],
    [
      "a missing person account",
      {},
      { person: { personId: JUAN, ownAmountMinor: 0 } },
      "person_not_found",
    ],
    [
      "a share equal to the total",
      { person: juan },
      { person: { personId: JUAN, ownAmountMinor: 900_00 } },
      "person_share_invalid",
    ],
    [
      "an inactive person",
      { person: { ...juan, isActive: false } },
      { person: { personId: JUAN, ownAmountMinor: 0 } },
      "account_inactive",
    ],
    [
      "a person without the currency",
      { person: { ...juan, currencies: [] } },
      { person: { personId: JUAN, ownAmountMinor: 0 } },
      "currency_not_in_account",
    ],
  ] as const)("rejects %s", (_label, referenceChanges, requestChanges, violation) => {
    // Arrange
    const request = entry(requestChanges as Partial<EntryRequest>);

    // Act
    const outcome = planEntry(request, refs(referenceChanges as Partial<EntryReferences>), {});

    // Assert
    expect(outcome).toEqual({ ok: false, violation });
  });

  it("accepts an inactive account that the edited movement already used", () => {
    // Arrange
    const dormant = { ...cash, isActive: false };

    // Act
    const outcome = planEntry(
      entry(),
      refs({ account: dormant, keepInactive: new Set([CASH]) }),
      {},
    );

    // Assert
    expect(outcome.ok).toBe(true);
  });
});

function transfer(overrides: Partial<TransferRequest> = {}): TransferRequest {
  return {
    type: "transfer",
    occurredOn: "2026-11-10",
    description: null,
    from: { accountId: CASH, currency: "ARS", amountMinor: 100_00 },
    to: { accountId: BANK, currency: "ARS", amountMinor: 100_00 },
    ...overrides,
  };
}

describe("planning a transfer", () => {
  it("moves money out of one account and into another with no installments", () => {
    // Arrange
    const request = transfer();

    // Act
    const outcome = planTransfer(request, { from: cash, to: bank, keepInactive: new Set() });

    // Assert
    expect(outcome).toMatchObject({
      ok: true,
      plan: {
        categoryId: null,
        installments: [],
        postings: [
          { accountId: CASH, currency: "ARS", amountMinor: -100_00 },
          { accountId: BANK, currency: "ARS", amountMinor: 100_00 },
        ],
      },
    });
  });

  it("records an exchange inside one account with two amounts", () => {
    // Arrange
    const request = transfer({
      from: { accountId: BANK, currency: "ARS", amountMinor: 1_230_000_00 },
      to: { accountId: BANK, currency: "USD", amountMinor: 1_000_00 },
    });

    // Act
    const outcome = planTransfer(request, { from: bank, to: bank, keepInactive: new Set() });

    // Assert
    expect(outcome).toMatchObject({
      ok: true,
      plan: {
        postings: [
          { currency: "ARS", amountMinor: -1_230_000_00 },
          { currency: "USD", amountMinor: 1_000_00 },
        ],
      },
    });
  });

  it.each([
    [
      "the same account and currency",
      transfer({ to: { accountId: CASH, currency: "ARS", amountMinor: 100_00 } }),
      "transfer_same_account",
    ],
    [
      "different amounts in one currency",
      transfer({ to: { accountId: BANK, currency: "ARS", amountMinor: 99_00 } }),
      "transfer_amount_mismatch",
    ],
    [
      "a currency the destination does not hold",
      transfer({ to: { accountId: CASH, currency: "USD", amountMinor: 1_00 } }),
      "currency_not_in_account",
    ],
  ] as const)("rejects %s", (_label, request, violation) => {
    // Arrange
    const destination = request.to.accountId === CASH ? cash : bank;

    // Act
    const outcome = planTransfer(request, { from: cash, to: destination, keepInactive: new Set() });

    // Assert
    expect(outcome).toEqual({ ok: false, violation });
  });

  it("rejects an exchange inside a person's account", () => {
    // Arrange
    const both = { ...juan, currencies: bank.currencies };
    const request = transfer({
      from: { accountId: JUAN, currency: "ARS", amountMinor: 100_00 },
      to: { accountId: JUAN, currency: "USD", amountMinor: 1_00 },
    });

    // Act
    const outcome = planTransfer(request, { from: both, to: both, keepInactive: new Set() });

    // Assert
    expect(outcome).toEqual({ ok: false, violation: "transfer_same_account" });
  });

  it("rejects an inactive account", () => {
    // Arrange
    const dormant = { ...bank, isActive: false };

    // Act
    const outcome = planTransfer(transfer(), { from: cash, to: dormant, keepInactive: new Set() });

    // Assert
    expect(outcome).toEqual({ ok: false, violation: "account_inactive" });
  });
});
