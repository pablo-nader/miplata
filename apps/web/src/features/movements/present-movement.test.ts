import type { Account, CategoryDto, Movement } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../app/i18n";
import { makeAccount } from "../../test/fake-api";
import {
  dayLabel,
  groupByDay,
  localDate,
  monthOfDate,
  monthRange,
  type PresentContext,
  presentMovement,
  shiftDays,
  statementPathOf,
} from "./present-movement";

const t = createI18n("es").t;

const accounts: Account[] = [
  makeAccount({ id: "visa", name: "Visa Galicia", type: "credit_card" }),
  makeAccount({ id: "galicia", name: "Galicia", type: "bank" }),
  makeAccount({ id: "juan", name: "Juan", type: "person" }),
];

const category: CategoryDto = {
  id: "food",
  type: "expense",
  groupId: null,
  nameKey: null,
  name: "Supermercado",
  icon: "shopping-cart",
  color: 1,
  isActive: true,
  sortOrder: 0,
};

const context: PresentContext = {
  t,
  account: (id) => accounts.find((account) => account.id === id),
  category: (id) => (id === "food" ? category : undefined),
  accountName: (account) => account.name ?? "",
  categoryName: (item) => item.name ?? "",
};

function expense(changes: Partial<Movement> = {}): Movement {
  return {
    id: "m1",
    type: "expense",
    occurredOn: "2026-11-24",
    description: null,
    categoryId: "food",
    account: { accountId: "visa", currency: "ARS", amountMinor: 48_300_00 },
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
    statement: null,
    ...changes,
  };
}

describe("presenting an expense", () => {
  it("shows the category as title, category and account as caption and an expense amount", () => {
    // Arrange
    const movement = expense();

    // Act
    const row = presentMovement(movement, context);

    // Assert
    expect(row).toMatchObject({
      title: "Supermercado",
      caption: "Supermercado · Visa Galicia",
      amount: { amount: 48_300, currency: "ARS", direction: "expense" },
      badge: { kind: "category", name: "Supermercado" },
      impact: { currency: "ARS", minor: -48_300_00 },
    });
    expect(row.tag).toBeUndefined();
  });

  it("prefers the description and tags the installment that goes in the first statement", () => {
    // Arrange
    const movement = expense({
      description: "Heladera",
      installments: [
        {
          number: 1,
          periodMonth: "2026-12",
          statementId: null,
          amountMinor: 300_00,
          ownAmountMinor: 300_00,
        },
        {
          number: 2,
          periodMonth: "2027-01",
          statementId: null,
          amountMinor: 300_00,
          ownAmountMinor: 300_00,
        },
        {
          number: 3,
          periodMonth: "2027-02",
          statementId: null,
          amountMinor: 300_00,
          ownAmountMinor: 300_00,
        },
      ],
    });

    // Act
    const row = presentMovement(movement, context);

    // Assert
    expect(row).toMatchObject({ title: "Heladera", tag: "1/3", amount: { amount: 300 } });
  });

  it("shows a purchase for another person as a loan that is not an expense", () => {
    // Arrange
    const movement = expense({
      description: "Zapatillas de Juan",
      person: { personId: "juan", ownAmountMinor: 0 },
      installments: [
        {
          number: 1,
          periodMonth: "2026-11",
          statementId: null,
          amountMinor: 120_000_00,
          ownAmountMinor: 0,
        },
      ],
      account: { accountId: "visa", currency: "ARS", amountMinor: 120_000_00 },
    });

    // Act
    const row = presentMovement(movement, context);

    // Assert
    expect(row).toMatchObject({
      caption: "Préstamo · Visa Galicia",
      tag: "Juan",
      note: "no es gasto",
      amount: { amount: 120_000, direction: "neutral" },
      badge: { kind: "account", type: "person" },
      impact: null,
    });
  });

  it("shows only the user's share of a shared purchase", () => {
    // Arrange
    const movement = expense({
      person: { personId: "juan", ownAmountMinor: 40_000_00 },
      installments: [
        {
          number: 1,
          periodMonth: "2026-11",
          statementId: null,
          amountMinor: 80_000_00,
          ownAmountMinor: 40_000_00,
        },
      ],
    });

    // Act
    const row = presentMovement(movement, context);

    // Assert
    expect(row).toMatchObject({ amount: { amount: 40_000, direction: "expense" }, tag: "Juan" });
  });

  it("shows the first installment of a purchase that is entirely for another person", () => {
    // Arrange
    const movement = expense({
      person: { personId: "juan", ownAmountMinor: 0 },
      installments: [
        {
          number: 1,
          periodMonth: "2026-11",
          statementId: null,
          amountMinor: 50_00,
          ownAmountMinor: 0,
        },
        {
          number: 2,
          periodMonth: "2026-12",
          statementId: null,
          amountMinor: 50_00,
          ownAmountMinor: 0,
        },
      ],
    });

    // Act
    const row = presentMovement(movement, context);

    // Assert
    expect(row).toMatchObject({ amount: { amount: 50 }, tag: "1/2 · Juan" });
  });
});

describe("presenting income and transfers", () => {
  it("shows an income as a positive amount", () => {
    // Arrange
    const income = expense({
      type: "income",
      account: { accountId: "galicia", currency: "ARS", amountMinor: 1_250_000_00 },
      installments: [
        {
          number: 1,
          periodMonth: "2026-11",
          statementId: null,
          amountMinor: 1_250_000_00,
          ownAmountMinor: 1_250_000_00,
        },
      ],
    });

    // Act
    const row = presentMovement(income, context);

    // Assert
    expect(row.amount).toEqual({ amount: 1_250_000, currency: "ARS", direction: "income" });
    expect(row.impact).toEqual({ currency: "ARS", minor: 1_250_000_00 });
  });

  it("shows an exchange with the dollars as the amount and the pesos as the note", () => {
    // Arrange
    const transfer: Movement = {
      ...expense(),
      type: "transfer",
      categoryId: null,
      account: null,
      installments: [],
      description: "Compra de dólares",
      from: { accountId: "galicia", currency: "ARS", amountMinor: 1_230_000_00 },
      to: { accountId: "galicia", currency: "USD", amountMinor: 1_000_00 },
    };

    // Act
    const row = presentMovement(transfer, context);

    // Assert
    expect(row).toMatchObject({
      title: "Compra de dólares",
      caption: "Galicia → Galicia US$",
      amount: { amount: 1000, currency: "USD", direction: "neutral" },
      note: { amount: 1_230_000, currency: "ARS" },
      badge: { kind: "account", type: "transfer" },
      impact: null,
    });
  });

  it("shows selling dollars with the dollars as the amount too", () => {
    // Arrange
    const sale: Movement = {
      ...expense(),
      type: "transfer",
      categoryId: null,
      account: null,
      installments: [],
      from: { accountId: "galicia", currency: "USD", amountMinor: 1_000_00 },
      to: { accountId: "galicia", currency: "ARS", amountMinor: 1_200_000_00 },
    };

    // Act
    const row = presentMovement(sale, context);

    // Assert
    expect(row.amount).toMatchObject({ amount: 1000, currency: "USD" });
    expect(row.note).toMatchObject({ amount: 1_200_000, currency: "ARS" });
  });

  it("shows a same-currency transfer with the outgoing amount and a default title", () => {
    // Arrange
    const transfer: Movement = {
      ...expense(),
      type: "transfer",
      categoryId: null,
      account: null,
      installments: [],
      from: { accountId: "galicia", currency: "ARS", amountMinor: 10_00 },
      to: { accountId: "juan", currency: "ARS", amountMinor: 10_00 },
    };

    // Act
    const row = presentMovement(transfer, context);

    // Assert
    expect(row).toMatchObject({
      title: "Transferencia",
      caption: "Galicia → Juan",
      amount: { amount: 10 },
    });
    expect(row.note).toBeUndefined();
  });
});

describe("grouping and dates", () => {
  it("groups consecutive rows by day and sums the user's impact per currency", () => {
    // Arrange
    const first = presentMovement(expense({ id: "a" }), context);
    const second = presentMovement(expense({ id: "b" }), context);
    const usd = presentMovement(
      expense({
        id: "c",
        account: { accountId: "visa", currency: "USD", amountMinor: 5_00 },
        installments: [
          {
            number: 1,
            periodMonth: "2026-11",
            statementId: null,
            amountMinor: 5_00,
            ownAmountMinor: 5_00,
          },
        ],
      }),
      context,
    );
    const other = presentMovement(expense({ id: "d", occurredOn: "2026-11-20" }), context);

    // Act
    const groups = groupByDay([first, second, usd, other]);

    // Assert
    expect(groups.map((group) => [group.date, group.rows.length])).toEqual([
      ["2026-11-24", 3],
      ["2026-11-20", 1],
    ]);
    expect(groups[0]?.totals).toEqual([
      { currency: "ARS", amount: -96_600 },
      { currency: "USD", amount: -5 },
    ]);
  });

  it("labels today, yesterday and older days", () => {
    // Arrange
    const today = "2026-11-25";

    // Act
    const labels = ["2026-11-25", "2026-11-24", "2026-11-20"].map((day) =>
      dayLabel(day, today, "es-AR", t),
    );

    // Assert
    expect(labels).toEqual(["Hoy, 25 nov", "Ayer, 24 nov", "20 nov"]);
  });

  it("works with dates and months", () => {
    // Arrange
    const date = new Date(2026, 10, 5);

    // Act
    const results = [
      localDate(date),
      shiftDays("2026-03-01", -1),
      monthOfDate("2026-11-25"),
      monthRange("2026-02"),
    ];

    // Assert
    expect(results).toEqual([
      "2026-11-05",
      "2026-02-28",
      "2026-11",
      { from: "2026-02-01", to: "2026-02-28" },
    ]);
  });

  it("uses the current day when none is given", () => {
    // Arrange
    const pattern = /^\d{4}-\d{2}-\d{2}$/;

    // Act
    const today = localDate();

    // Assert
    expect(today).toMatch(pattern);
  });
});

describe("routing a movement to its statement", () => {
  const statement = { id: "st-nov", accountId: "visa", periodMonth: "2026-11" };

  it("opens the charge on the statement when the expense is a statement charge", () => {
    // Arrange
    const movement = expense({ statement });

    // Act
    const row = presentMovement(movement, context);

    // Assert
    expect(row.to).toBe("/accounts/visa/statement/charges/m1?period=2026-11");
  });

  it("opens the statement itself when the movement is a payment", () => {
    // Arrange
    const movement = expense({ type: "transfer", statement });

    // Act
    const path = statementPathOf(movement);

    // Assert
    expect(path).toBe("/accounts/visa/statement?period=2026-11");
  });

  it("opens the movement form when the movement does not belong to a statement", () => {
    // Arrange
    const movement = expense();

    // Act
    const row = presentMovement(movement, context);

    // Assert
    expect(row.to).toBe("/movements/m1/edit");
    expect(statementPathOf(movement)).toBeNull();
  });
});
