import type { StatementDetail, StatementTotals } from "@miplata/shared";
import { makeAccount } from "./fake-api";

export const card = makeAccount({
  id: "card-1",
  type: "credit_card",
  name: "Visa Galicia",
  closingDay: 27,
  dueDay: 5,
  currencies: [
    { currency: "ARS", openingBalanceMinor: 0, balanceMinor: -504_900_00 },
    { currency: "USD", openingBalanceMinor: 0, balanceMinor: -35_00 },
  ],
});

export const bank = makeAccount({
  id: "bank-1",
  type: "bank",
  name: "Galicia",
  currencies: [
    { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 1_000_000_00 },
    { currency: "USD", openingBalanceMinor: 0, balanceMinor: 100_00 },
  ],
});

function totals(
  currency: "ARS" | "USD",
  overrides: Partial<StatementTotals> = {},
): StatementTotals {
  return {
    currency,
    previousBalanceMinor: 0,
    ownMinor: 0,
    othersMinor: 0,
    chargesMinor: 0,
    paymentsMinor: 0,
    totalMinor: 0,
    minimumMinor: null,
    bankTotalMinor: null,
    differenceMinor: null,
    ...overrides,
  };
}

export function detailOf(overrides: Partial<StatementDetail> = {}): StatementDetail {
  return {
    id: "st-nov",
    accountId: "card-1",
    periodMonth: "2026-11",
    closingDate: "2026-11-27",
    dueDate: "2026-12-05",
    totals: [
      totals("ARS", {
        ownMinor: 348_300_00,
        othersMinor: 120_000_00,
        chargesMinor: 36_600_00,
        totalMinor: 504_900_00,
        minimumMinor: 50_000_00,
        bankTotalMinor: 504_900_00,
        differenceMinor: 0,
      }),
      totals("USD", { ownMinor: 35_00, totalMinor: 35_00 }),
    ],
    purchases: [],
    others: [],
    charges: [],
    payments: [],
    ...overrides,
  };
}

const november = detailOf();
const december = detailOf({
  id: "st-dec",
  periodMonth: "2026-12",
  closingDate: "2026-12-27",
  dueDate: "2027-01-05",
  totals: [totals("ARS"), totals("USD")],
});

function summaryOf(detail: StatementDetail) {
  const { purchases: _p, others: _o, charges: _c, payments: _pay, ...summary } = detail;
  return summary;
}

export const statementCatalog = {
  income: [],
  expenseGroups: [
    {
      id: "g-fin",
      nameKey: "defaults.group.financialCharges",
      name: null,
      sortOrder: 0,
      categories: [
        {
          id: "cat-interest",
          type: "expense",
          groupId: "g-fin",
          nameKey: "defaults.category.interest",
          name: null,
          icon: "percent",
          color: 3,
          isActive: true,
          sortOrder: 0,
        },
      ],
    },
  ],
};

export const statementLookups = {
  "GET /api/accounts": { body: [card, bank] },
  "GET /api/people": { body: [] },
  "GET /api/statements?accountId=card-1": {
    body: { items: [summaryOf(november), summaryOf(december)] },
  },
  "GET /api/statements/st-nov": { body: november },
  "GET /api/statements/st-dec": { body: december },
  "GET /api/categories": { body: statementCatalog },
};
