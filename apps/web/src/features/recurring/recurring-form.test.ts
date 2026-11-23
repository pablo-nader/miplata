import { describe, expect, it } from "vitest";
import { makeAccount } from "../../test/fake-api";
import { makeRecurring } from "../../test/fake-recurring";
import {
  applyChange,
  buildRequest,
  emptyForm,
  type FormState,
  formFromRecurring,
} from "./recurring-form";

const ACCOUNT = "11111111-1111-4111-8111-111111111111";
const CATEGORY = "22222222-2222-4222-8222-222222222222";

function filled(overrides: Partial<FormState> = {}): FormState {
  return {
    ...emptyForm("2026-11-25"),
    amount: "575.000",
    accountId: ACCOUNT,
    categoryId: CATEGORY,
    description: " Alquiler ",
    ...overrides,
  };
}

describe("emptyForm", () => {
  it("starts as a monthly fixed expense on the current day", () => {
    // Arrange
    const today = "2026-11-05";

    // Act
    const form = emptyForm(today);

    // Assert
    expect(form).toMatchObject({
      type: "expense",
      frequency: "monthly",
      amountMode: "fixed",
      dayOfMonth: "5",
      startsOn: today,
      endsOn: "",
    });
  });
});

describe("buildRequest", () => {
  it("builds a fixed request in minor units", () => {
    // Arrange
    const form = filled();

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toEqual({
      ok: true,
      value: {
        type: "expense",
        frequency: "monthly",
        dayOfMonth: 25,
        amountMode: "fixed",
        amountMinor: 57_500_000,
        currency: "ARS",
        accountId: ACCOUNT,
        categoryId: CATEGORY,
        description: "Alquiler",
        startsOn: "2026-11-25",
        endsOn: null,
      },
    });
  });

  it("requires an amount only for fixed items", () => {
    // Arrange
    const fixed = filled({ amount: "" });
    const variable = filled({ amount: "", amountMode: "variable" });

    // Act
    const results = [buildRequest(fixed), buildRequest(variable)];

    // Assert
    expect(results[0]).toEqual({ ok: false, errors: { amount: true } });
    expect(results[1]).toMatchObject({ ok: true, value: { amountMinor: null } });
  });

  it("keeps a reference amount for a variable item and rejects a malformed one", () => {
    // Arrange
    const reference = filled({ amountMode: "variable", amount: "41.500" });
    const broken = filled({ amountMode: "variable", amount: "abc" });

    // Act
    const results = [buildRequest(reference), buildRequest(broken)];

    // Assert
    expect(results[0]).toMatchObject({ ok: true, value: { amountMinor: 4_150_000 } });
    expect(results[1]).toEqual({ ok: false, errors: { amount: true } });
  });

  it("reports every invalid field", () => {
    // Arrange
    const form = filled({
      accountId: null,
      categoryId: null,
      dayOfMonth: "32",
      startsOn: "nope",
      endsOn: "2020-01-01",
      amount: "0",
    });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toEqual({
      ok: false,
      errors: {
        amount: true,
        category: true,
        account: true,
        day: true,
        startsOn: true,
        endsOn: true,
      },
    });
  });

  it.each(["0", "1.5", "x", ""])("rejects the day %j", (dayOfMonth) => {
    // Arrange
    const form = filled({ dayOfMonth });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toEqual({ ok: false, errors: { day: true } });
  });

  it("sends an end date and a null description when blank", () => {
    // Arrange
    const form = filled({ endsOn: "2027-01-01", description: "  " });

    // Act
    const built = buildRequest(form);

    // Assert
    expect(built).toMatchObject({ ok: true, value: { endsOn: "2027-01-01", description: null } });
  });
});

describe("formFromRecurring", () => {
  it("round-trips a definition", () => {
    // Arrange
    const recurring = makeRecurring({
      amountMinor: 41_550,
      endsOn: "2027-01-01",
      description: null,
    });

    // Act
    const form = formFromRecurring(recurring);

    // Assert
    expect(form).toMatchObject({
      amount: "415,50",
      endsOn: "2027-01-01",
      description: "",
      dayOfMonth: "5",
    });
  });

  it("leaves the amount empty for a variable definition", () => {
    // Arrange
    const recurring = makeRecurring({ amountMode: "variable", amountMinor: null });

    // Act
    const form = formFromRecurring(recurring);

    // Assert
    expect(form.amount).toBe("");
  });
});

describe("applyChange", () => {
  const dollars = makeAccount({
    id: "acc-usd",
    currencies: [{ currency: "USD", openingBalanceMinor: 0, balanceMinor: 0 }],
  });

  it("clears the category when the type changes", () => {
    // Arrange
    const form = filled();

    // Act
    const next = applyChange(form, { type: "income" }, []);

    // Assert
    expect(next.categoryId).toBeNull();
    expect(applyChange(form, { description: "x" }, []).categoryId).toBe(CATEGORY);
  });

  it("switches to a currency the chosen account holds", () => {
    // Arrange
    const form = filled({ currency: "ARS" });

    // Act
    const next = applyChange(form, { accountId: "acc-usd" }, [dollars]);

    // Assert
    expect(next.currency).toBe("USD");
  });
});
