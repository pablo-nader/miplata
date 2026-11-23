import type { Movement } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { makeAccount } from "../../test/fake-api";
import {
  applyChange,
  buildRequest,
  currenciesOf,
  defaultAccountId,
  emptyForm,
  exchangeRate,
  formFromMovement,
  holdsCurrency,
  installmentAmountMinor,
  isCardExpense,
  parseAmountMinor,
} from "./movement-form";

const CASH = makeAccount({
  id: "cash",
  currencies: [
    { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 },
    { currency: "USD", openingBalanceMinor: 0, balanceMinor: 0 },
  ],
});
const PESOS = makeAccount({ id: "pesos" });
const VISA = makeAccount({ id: "visa", type: "credit_card", closingDay: 20, dueDay: 5 });
const JUAN = makeAccount({ id: "juan", type: "person" });
const ACCOUNTS = [PESOS, CASH, VISA, JUAN];

function filled(changes = {}) {
  return {
    ...emptyForm("2026-11-25"),
    amount: "900.000",
    categoryId: "food",
    accountId: "cash",
    ...changes,
  };
}

describe("parsing amounts", () => {
  it.each([
    ["900.000", 90_000_000],
    ["1.250,50", 125_050],
    ["48300", 4_830_000],
  ])("reads %s", (text, minor) => {
    // Arrange
    const input = text;

    // Act
    const parsed = parseAmountMinor(input, "ARS");

    // Assert
    expect(parsed).toBe(minor);
  });

  it.each(["", "abc", "0", "-5"])("rejects %j", (text) => {
    // Arrange
    const input = text;

    // Act
    const parsed = parseAmountMinor(input, "ARS");

    // Assert
    expect(parsed).toBeNull();
  });
});

describe("building an entry request", () => {
  it("builds an expense in minor units", () => {
    // Arrange
    const form = filled({ description: " Heladera " });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        type: "expense",
        occurredOn: "2026-11-25",
        description: "Heladera",
        categoryId: "food",
        accountId: "cash",
        currency: "ARS",
        amountMinor: 90_000_000,
        installments: 1,
        person: null,
      },
    });
  });

  it("builds an income without installments or a person", () => {
    // Arrange
    const form = filled({ type: "income", installments: 3, forOther: true, personId: "juan" });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: { type: "income", installments: 1, person: null },
    });
  });

  it("builds a card purchase for another person with the user's share", () => {
    // Arrange
    const form = filled({
      accountId: "visa",
      installments: 3,
      forOther: true,
      personId: "juan",
      ownShare: "300.000",
    });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: { installments: 3, person: { personId: "juan", ownAmountMinor: 30_000_000 } },
    });
  });

  it("treats a blank share as nothing for the user", () => {
    // Arrange
    const form = filled({ forOther: true, personId: "juan" });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toMatchObject({ ok: true, value: { person: { ownAmountMinor: 0 } } });
  });

  it("reports every missing field", () => {
    // Arrange
    const form = { ...emptyForm("not-a-date"), forOther: true };

    // Act
    const built = buildRequest({ ...form, type: "expense" });

    // Assert
    expect(built).toEqual({
      ok: false,
      errors: { amount: true, category: true, account: true, date: true, person: true },
    });
  });

  it.each([
    ["a share equal to the total", { ownShare: "900.000" }],
    ["a share that is not a number", { ownShare: "abc" }],
  ])("rejects %s", (_label, changes) => {
    // Arrange
    const form = filled({ forOther: true, personId: "juan", ...changes });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toMatchObject({ ok: false, errors: { share: true } });
  });
});

describe("building a transfer request", () => {
  it("builds an exchange with two currencies", () => {
    // Arrange
    const form = {
      ...emptyForm("2026-11-25", "transfer"),
      fromAccountId: "cash",
      fromAmount: "1.230.000",
      toAccountId: "cash",
      toCurrency: "USD" as const,
      toAmount: "1.000",
      description: "Compra de dólares",
    };

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        type: "transfer",
        occurredOn: "2026-11-25",
        description: "Compra de dólares",
        from: { accountId: "cash", currency: "ARS", amountMinor: 123_000_000 },
        to: { accountId: "cash", currency: "USD", amountMinor: 100_000 },
      },
    });
  });

  it("reports missing legs", () => {
    // Arrange
    const form = emptyForm("2026-11-25", "transfer");

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toEqual({
      ok: false,
      errors: { fromAccount: true, toAccount: true, fromAmount: true, toAmount: true },
    });
  });
});

describe("exchange rate and installments", () => {
  it("derives the rate in pesos per dollar", () => {
    // Arrange
    const form = {
      ...emptyForm("2026-11-25", "transfer"),
      fromAmount: "1.230.000",
      toCurrency: "USD" as const,
      toAmount: "1.000",
    };

    // Act
    const rate = exchangeRate(form);

    // Assert
    expect(rate).toBe(1230);
  });

  it("derives the rate when the dollars leave", () => {
    // Arrange
    const form = {
      ...emptyForm("2026-11-25", "transfer"),
      fromCurrency: "USD" as const,
      fromAmount: "100",
      toAmount: "123.000",
    };

    // Act
    const rate = exchangeRate(form);

    // Assert
    expect(rate).toBe(1230);
  });

  it.each([
    ["the same currency", { toAmount: "100", fromAmount: "100" }],
    ["missing amounts", { toCurrency: "USD" as const }],
  ])("has no rate with %s", (_label, changes) => {
    // Arrange
    const form = { ...emptyForm("2026-11-25", "transfer"), ...changes };

    // Act
    const rate = exchangeRate(form);

    // Assert
    expect(rate).toBeNull();
  });

  it("has no rate outside transfers", () => {
    // Arrange
    const form = filled();

    // Act
    const rate = exchangeRate(form);

    // Assert
    expect(rate).toBeNull();
  });

  it("splits the amount per installment", () => {
    // Arrange
    const form = filled({ installments: 3 });

    // Act
    const each = installmentAmountMinor(form);

    // Assert
    expect(each).toBe(30_000_000);
  });

  it("has no installment amount without an amount or with too many installments", () => {
    // Arrange
    const empty = filled({ amount: "" });
    const tiny = filled({ amount: "0,02", installments: 3 });

    // Act
    const results = [installmentAmountMinor(empty), installmentAmountMinor(tiny)];

    // Assert
    expect(results).toEqual([null, null]);
  });
});

describe("changing the form", () => {
  it("picks the first currency of a newly chosen account that lacks the current one", () => {
    // Arrange
    const dollars = makeAccount({
      id: "usd",
      currencies: [{ currency: "USD", openingBalanceMinor: 0, balanceMinor: 0 }],
    });
    const form = filled();

    // Act
    const next = applyChange(form, { accountId: "usd" }, [...ACCOUNTS, dollars]);

    // Assert
    expect(next.currency).toBe("USD");
  });

  it("keeps installments only for card expenses", () => {
    // Arrange
    const form = filled({ accountId: "visa", installments: 6 });

    // Act
    const toCash = applyChange(form, { accountId: "cash" }, ACCOUNTS);
    const toIncome = applyChange(form, { type: "income" }, ACCOUNTS);
    const stays = applyChange(form, { description: "x" }, ACCOUNTS);

    // Assert
    expect([toCash.installments, toIncome.installments, stays.installments]).toEqual([1, 1, 6]);
  });

  it("resets the category and the person switch when the type changes", () => {
    // Arrange
    const form = filled({ forOther: true, personId: "juan" });

    // Act
    const next = applyChange(form, { type: "income" }, ACCOUNTS);

    // Assert
    expect(next).toMatchObject({ type: "income", categoryId: null, forOther: false });
  });

  it("carries the account and amount into a transfer and back", () => {
    // Arrange
    const form = filled({ currency: "USD" as const });

    // Act
    const transfer = applyChange(form, { type: "transfer" }, ACCOUNTS);
    const back = applyChange(transfer, { type: "expense" }, ACCOUNTS);

    // Assert
    expect(transfer).toMatchObject({
      fromAccountId: "cash",
      fromCurrency: "USD",
      fromAmount: "900.000",
      categoryId: null,
    });
    expect(back).toMatchObject({ accountId: "cash", currency: "USD", amount: "900.000" });
  });

  it("keeps the account when a transfer from a person becomes an expense", () => {
    // Arrange
    const form = {
      ...emptyForm("2026-11-25", "transfer"),
      fromAccountId: "juan",
      accountId: "cash",
    };

    // Act
    const next = applyChange(form, { type: "expense" }, ACCOUNTS);

    // Assert
    expect(next.accountId).toBe("cash");
  });

  it("fixes the currency of each transfer leg", () => {
    // Arrange
    const dollars = makeAccount({
      id: "usd",
      currencies: [{ currency: "USD", openingBalanceMinor: 0, balanceMinor: 0 }],
    });
    const form = emptyForm("2026-11-25", "transfer");

    // Act
    const next = applyChange(form, { fromAccountId: "usd", toAccountId: "usd" }, [dollars]);

    // Assert
    expect([next.fromCurrency, next.toCurrency]).toEqual(["USD", "USD"]);
  });
});

describe("account helpers", () => {
  it("chooses the first active account that is not a person", () => {
    // Arrange
    const inactive = makeAccount({ id: "off", isActive: false });

    // Act
    const chosen = defaultAccountId([JUAN, inactive, CASH]);

    // Assert
    expect(chosen).toBe("cash");
  });

  it("has no default when there is no money account", () => {
    // Arrange
    const accounts = [JUAN];

    // Act
    const chosen = defaultAccountId(accounts);

    // Assert
    expect(chosen).toBeNull();
  });

  it("lists the currencies an account holds", () => {
    // Arrange
    const account = CASH;

    // Act
    const currencies = currenciesOf(account);

    // Assert
    expect(currencies).toEqual(["ARS", "USD"]);
    expect(currenciesOf(undefined)).toEqual([]);
    expect(holdsCurrency(undefined, "ARS")).toBe(false);
    expect(isCardExpense(filled(), VISA)).toBe(true);
    expect(isCardExpense(filled({ type: "income" }), VISA)).toBe(false);
  });
});

describe("editing an existing movement", () => {
  const base: Movement = {
    id: "m1",
    type: "expense",
    occurredOn: "2026-11-24",
    description: "Heladera",
    categoryId: "food",
    account: { accountId: "visa", currency: "ARS", amountMinor: 90_000_050 },
    from: null,
    to: null,
    person: { personId: "juan", ownAmountMinor: 30_000_000 },
    installments: [
      { number: 1, periodMonth: "2026-11", statementId: null, amountMinor: 1, ownAmountMinor: 1 },
      { number: 2, periodMonth: "2026-12", statementId: null, amountMinor: 1, ownAmountMinor: 1 },
    ],
  };

  it("fills the form from an expense with its installments and share", () => {
    // Arrange
    const movement = base;

    // Act
    const form = formFromMovement(movement);

    // Assert
    expect(form).toMatchObject({
      type: "expense",
      description: "Heladera",
      accountId: "visa",
      amount: "900000,50",
      installments: 2,
      forOther: true,
      personId: "juan",
      ownShare: "300000",
    });
  });

  it("fills the form from a transfer", () => {
    // Arrange
    const transfer: Movement = {
      ...base,
      type: "transfer",
      categoryId: null,
      account: null,
      person: null,
      installments: [],
      from: { accountId: "cash", currency: "ARS", amountMinor: 123_000_000 },
      to: { accountId: "cash", currency: "USD", amountMinor: 100_000 },
    };

    // Act
    const form = formFromMovement(transfer);

    // Assert
    expect(form).toMatchObject({
      type: "transfer",
      fromAccountId: "cash",
      fromAmount: "1230000",
      toCurrency: "USD",
      toAmount: "1000",
    });
  });

  it("round-trips an exact amount back to the same request", () => {
    // Arrange
    const form = formFromMovement({ ...base, person: null });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toMatchObject({ ok: true, value: { amountMinor: 90_000_050 } });
  });
});
