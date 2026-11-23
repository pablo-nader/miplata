import type { CategoriesResponse, Movement } from "@miplata/shared";
import { makeAccount } from "./fake-api";

export const cash = makeAccount({
  id: "acc-cash",
  type: "cash",
  name: "Efectivo",
  currencies: [
    { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 },
    { currency: "USD", openingBalanceMinor: 0, balanceMinor: 0 },
  ],
});

export const visa = makeAccount({
  id: "acc-visa",
  type: "credit_card",
  name: "Visa Galicia",
  closingDay: 20,
  dueDay: 5,
});

export const juan = makeAccount({ id: "acc-juan", type: "person", name: "Juan" });

export const catalog: CategoriesResponse = {
  expenseGroups: [
    {
      id: "group-home",
      nameKey: null,
      name: "Hogar",
      sortOrder: 0,
      categories: [
        {
          id: "cat-maintenance",
          type: "expense",
          groupId: "group-home",
          nameKey: null,
          name: "Mantenimiento",
          icon: "hammer",
          color: 5,
          isActive: true,
          sortOrder: 0,
        },
        {
          id: "cat-groceries",
          type: "expense",
          groupId: "group-home",
          nameKey: null,
          name: "Supermercado",
          icon: "shopping-cart",
          color: 1,
          isActive: true,
          sortOrder: 1,
        },
      ],
    },
  ],
  income: [
    {
      id: "cat-salary",
      type: "income",
      groupId: null,
      nameKey: null,
      name: "Sueldo",
      icon: "briefcase",
      color: 2,
      isActive: true,
      sortOrder: 0,
    },
  ],
};

export const lookupHandlers = {
  "GET /api/accounts": { body: [cash, visa] },
  "GET /api/people": { body: [juan] },
  "GET /api/categories": { body: catalog },
};

export function makeMovement(overrides: Partial<Movement> = {}): Movement {
  return {
    id: "mov-1",
    type: "expense",
    occurredOn: "2026-11-24",
    description: "Coto",
    categoryId: "cat-groceries",
    account: { accountId: "acc-visa", currency: "ARS", amountMinor: 48_300_00 },
    from: null,
    to: null,
    person: null,
    installments: [
      {
        number: 1,
        periodMonth: "2026-11",
        statementId: null,
        amountMinor: 48_300_00,
        ownAmountMinor: 48_300_00,
      },
    ],
    ...overrides,
  };
}
