import { describe, expect, it } from "vitest";
import { galicia, makeAccount, mercadoPago } from "../../test/fake-api";
import {
  buildCreate,
  buildUpdate,
  emptyForm,
  type FormState,
  formFromAccount,
  institutionsFor,
} from "./account-form";

const institutions = [galicia, mercadoPago];

function form(overrides: Partial<FormState> = {}): FormState {
  return { ...emptyForm("cash"), name: "Pocket", ...overrides };
}

describe("buildCreate", () => {
  it("builds a cash account with opening balances in minor units", () => {
    // Arrange
    const input = form({
      currencies: {
        ARS: { enabled: true, amount: "1.250,50" },
        USD: { enabled: true, amount: "450" },
      },
    });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        kind: "account",
        body: {
          type: "cash",
          name: "Pocket",
          currencies: [
            { currency: "ARS", openingBalanceMinor: 125_050 },
            { currency: "USD", openingBalanceMinor: 45_000 },
          ],
        },
      },
    });
  });

  it("treats an empty amount as zero", () => {
    // Arrange
    const input = form();

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: { body: { currencies: [{ currency: "ARS", openingBalanceMinor: 0 }] } },
    });
  });

  it("stores a card debt as a negative opening balance and sends the days", () => {
    // Arrange
    const input = form({
      type: "credit_card",
      name: "Visa",
      closingDay: "27",
      dueDay: "5",
      currencies: { ARS: { enabled: true, amount: "1000" }, USD: { enabled: false, amount: "" } },
    });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: {
        body: {
          type: "credit_card",
          closingDay: 27,
          dueDay: 5,
          currencies: [{ currency: "ARS", openingBalanceMinor: -100_000 }],
        },
      },
    });
  });

  it("sends a person to the people endpoint with a signed balance", () => {
    // Arrange
    const input = form({
      type: "person",
      name: "Sofi",
      currencies: { ARS: { enabled: false, amount: "" }, USD: { enabled: true, amount: "-200" } },
    });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        kind: "person",
        body: { name: "Sofi", currencies: [{ currency: "USD", openingBalanceMinor: -20_000 }] },
      },
    });
  });

  it("sends the institution and lets the name be empty", () => {
    // Arrange
    const input = form({ type: "bank", name: "", institutionId: galicia.id });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: { body: { type: "bank", institutionId: galicia.id } },
    });
    expect(built.ok && "name" in built.value.body).toBe(false);
  });

  it("requires a name when there is no institution", () => {
    // Arrange
    const input = form({ type: "bank", name: "  " });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toMatchObject({ ok: false, errors: { name: "nameRequired" } });
  });

  it("requires at least one currency", () => {
    // Arrange
    const input = form({
      currencies: { ARS: { enabled: false, amount: "" }, USD: { enabled: false, amount: "" } },
    });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toMatchObject({ ok: false, errors: { currencies: "currencyRequired" } });
  });

  it("flags an invalid amount per currency", () => {
    // Arrange
    const input = form({
      currencies: { ARS: { enabled: true, amount: "abc" }, USD: { enabled: false, amount: "" } },
    });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toMatchObject({ ok: false, errors: { amounts: { ARS: "amountInvalid" } } });
  });

  it("flags card days outside 1 to 31 and accepts empty days", () => {
    // Arrange
    const invalid = form({ type: "credit_card", closingDay: "32", dueDay: "x" });
    const empty = form({ type: "credit_card" });

    // Act
    const rejected = buildCreate(invalid, institutions);
    const accepted = buildCreate(empty, institutions);

    // Assert
    expect(rejected).toMatchObject({
      ok: false,
      errors: { closingDay: "dayInvalid", dueDay: "dayInvalid" },
    });
    expect(accepted).toMatchObject({
      ok: true,
      value: { body: { closingDay: null, dueDay: null } },
    });
  });
});

describe("formFromAccount and buildUpdate", () => {
  it("shows a card debt as a positive number and returns to the stored sign", () => {
    // Arrange
    const card = makeAccount({
      type: "credit_card",
      name: "Visa",
      closingDay: 27,
      dueDay: 5,
      currencies: [{ currency: "ARS", openingBalanceMinor: -100_000, balanceMinor: -100_000 }],
    });

    // Act
    const state = formFromAccount(card, "Visa");
    const built = buildUpdate(state, institutions, { account: card, displayName: "Visa" });

    // Assert
    expect(state.currencies.ARS).toEqual({ enabled: true, amount: "1000" });
    expect(state).toMatchObject({ closingDay: "27", dueDay: "5" });
    expect(built).toMatchObject({
      ok: true,
      value: { body: { currencies: [{ currency: "ARS", openingBalanceMinor: -100_000 }] } },
    });
  });

  it("only sends the name when it changed", () => {
    // Arrange
    const account = makeAccount({ name: null, nameKey: "defaults.account.cash" });
    const same = formFromAccount(account, "Efectivo");
    const renamed = { ...same, name: "Savings" };

    // Act
    const unchanged = buildUpdate(same, institutions, { account, displayName: "Efectivo" });
    const changed = buildUpdate(renamed, institutions, { account, displayName: "Efectivo" });

    // Assert
    expect(unchanged.ok && "name" in unchanged.value.body).toBe(false);
    expect(changed).toMatchObject({ ok: true, value: { body: { name: "Savings" } } });
  });

  it("uses the institution name when the name is cleared", () => {
    // Arrange
    const account = makeAccount({ type: "bank", name: "Old", institution: galicia });
    const state = { ...formFromAccount(account, "Old"), name: "", institutionId: galicia.id };

    // Act
    const built = buildUpdate(state, institutions, { account, displayName: "Old" });

    // Assert
    expect(built).toMatchObject({
      ok: true,
      value: { body: { name: "Galicia", institutionId: galicia.id } },
    });
  });

  it("builds a person update without institution", () => {
    // Arrange
    const person = makeAccount({ type: "person", name: "Juan" });
    const state = { ...formFromAccount(person, "Juan"), name: "Juan P." };

    // Act
    const built = buildUpdate(state, institutions, { account: person, displayName: "Juan" });

    // Assert
    expect(built).toMatchObject({ ok: true, value: { kind: "person", body: { name: "Juan P." } } });
  });

  it("reports validation errors on update", () => {
    // Arrange
    const account = makeAccount();
    const state = {
      ...formFromAccount(account, "Pocket"),
      currencies: { ARS: { enabled: false, amount: "" }, USD: { enabled: false, amount: "" } },
    };

    // Act
    const built = buildUpdate(state, institutions, { account, displayName: "Pocket" });

    // Assert
    expect(built).toMatchObject({ ok: false, errors: { currencies: "currencyRequired" } });
  });
});

describe("institutionsFor", () => {
  it("filters the catalog by account type", () => {
    // Arrange
    const catalog = [galicia, mercadoPago];

    // Act
    const results = {
      bank: institutionsFor("bank", catalog),
      wallet: institutionsFor("wallet", catalog),
      card: institutionsFor("credit_card", catalog),
      cash: institutionsFor("cash", catalog),
    };

    // Assert
    expect(results.bank).toEqual([galicia]);
    expect(results.wallet).toEqual([mercadoPago]);
    expect(results.card).toEqual(catalog);
    expect(results.cash).toEqual([]);
  });
});

describe("name length", () => {
  it("rejects names longer than 60 characters", () => {
    // Arrange
    const input = form({ name: "x".repeat(61) });

    // Act
    const built = buildCreate(input, institutions);

    // Assert
    expect(built).toMatchObject({ ok: false, errors: { name: "nameTooLong" } });
  });
});
