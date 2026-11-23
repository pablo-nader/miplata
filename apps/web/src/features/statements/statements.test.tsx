import type { StatementDetail, StatementTotals } from "@miplata/shared";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeAccount, stubApi } from "../../test/fake-api";
import { renderApp } from "../../test/render";
import { ChargeFormContainer } from "./ChargeFormContainer";
import { PayStatementContainer } from "./PayStatementContainer";
import { ReconcileContainer } from "./ReconcileContainer";
import { StatementContainer } from "./StatementContainer";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 23, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const card = makeAccount({
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
const bank = makeAccount({
  id: "bank-1",
  type: "bank",
  name: "Galicia",
  currencies: [
    { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 1_000_000_00 },
    { currency: "USD", openingBalanceMinor: 0, balanceMinor: 100_00 },
  ],
});
const juan = makeAccount({ id: "juan", type: "person", name: "Juan" });

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

function detailOf(overrides: Partial<StatementDetail> = {}): StatementDetail {
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
    others: [
      {
        movementId: "m1",
        description: null,
        personId: "juan",
        number: 1,
        installmentCount: 1,
        currency: "ARS",
        amountMinor: 120_000_00,
      },
    ],
    charges: [
      {
        movementId: "ch1",
        categoryId: "cat-interest",
        description: "Late interest",
        occurredOn: "2026-11-27",
        currency: "ARS",
        amountMinor: 36_600_00,
        isAdjustment: false,
      },
    ],
    payments: [],
    ...overrides,
  };
}

function summaryOf(detail: StatementDetail) {
  const { purchases: _p, others: _o, charges: _c, payments: _pay, ...summary } = detail;
  return summary;
}

const november = detailOf();
const december = detailOf({
  id: "st-dec",
  periodMonth: "2026-12",
  closingDate: "2026-12-27",
  dueDate: "2027-01-05",
  totals: [totals("ARS"), totals("USD")],
  others: [],
  charges: [],
});

const catalog = {
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
        {
          id: "cat-old",
          type: "expense",
          groupId: "g-fin",
          nameKey: "defaults.category.fees",
          name: null,
          icon: null,
          color: 3,
          isActive: false,
          sortOrder: 1,
        },
      ],
    },
  ],
};

const lookups = {
  "GET /api/accounts": { body: [card, bank] },
  "GET /api/people": { body: [juan] },
  "GET /api/statements?accountId=card-1": {
    body: { items: [summaryOf(november), summaryOf(december)] },
  },
  "GET /api/statements/st-nov": { body: november },
  "GET /api/statements/st-dec": { body: december },
  "GET /api/categories": { body: catalog },
};

function screenAt(path: string, element: React.ReactElement, route: string) {
  return renderApp(
    <Routes>
      <Route path={route} element={element} />
    </Routes>,
    "es",
    path,
  );
}

describe("StatementContainer", () => {
  it("shows the statement of the current period with its breakdown and the people who owe", async () => {
    // Arrange
    stubApi(lookups);

    // Act
    screenAt(
      "/accounts/card-1/statement",
      <StatementContainer />,
      "/accounts/:accountId/statement",
    );
    const heading = await screen.findByRole("heading", { level: 1, name: "Visa Galicia" });

    // Assert
    expect(heading).toBeDefined();
    expect(await screen.findByText("Cierra 27/11 · vence 5/12")).toBeDefined();
    expect(screen.getByText("$ 504.900")).toBeDefined();
    expect(screen.getByText("+ US$ 35")).toBeDefined();
    expect(screen.getAllByText("Tus compras y cuotas").length).toBeGreaterThan(0);
    expect(screen.getByText("$ 348.300")).toBeDefined();
    expect(screen.getByText("Total del banco: $ 504.900")).toBeDefined();
    expect(screen.getByText("Sin diferencia")).toBeDefined();
    expect(screen.getByText(/Juan te debe \$ 120\.000/)).toBeDefined();
    expect(screen.getByRole("link", { name: /Late interest/ })).toBeDefined();
  });

  it("switches to another period and keeps the actions pointing at it", async () => {
    // Arrange
    stubApi(lookups);
    const user = userEvent.setup();
    screenAt(
      "/accounts/card-1/statement",
      <StatementContainer />,
      "/accounts/:accountId/statement",
    );
    await screen.findByText("Cierra 27/11 · vence 5/12");

    // Act
    await user.click(screen.getByRole("button", { name: "Dic" }));

    // Assert
    expect(await screen.findByText("Cierra 27/12 · vence 5/1")).toBeDefined();
    expect(screen.getByRole("link", { name: "Pagar resumen" }).getAttribute("href")).toBe(
      "/accounts/card-1/statement/pay?period=2026-12",
    );
    expect(screen.getByText("Todavía no cargaste el total del banco.")).toBeDefined();
  });

  it("offers to record a positive difference as an adjustment", async () => {
    // Arrange
    const withDifference = detailOf({
      totals: [
        totals("ARS", {
          ownMinor: 100_00,
          totalMinor: 100_00,
          bankTotalMinor: 130_00,
          differenceMinor: 30_00,
        }),
        totals("USD"),
      ],
      others: [],
      charges: [],
    });
    const { calls } = stubApi({
      ...lookups,
      "GET /api/statements?accountId=card-1": { body: { items: [summaryOf(withDifference)] } },
      "GET /api/statements/st-nov": { body: withDifference },
      "POST /api/statements/st-nov/adjustment": { body: withDifference },
    });
    const user = userEvent.setup();
    screenAt(
      "/accounts/card-1/statement",
      <StatementContainer />,
      "/accounts/:accountId/statement",
    );

    // Act
    await user.click(await screen.findByRole("button", { name: /^Registrar \$\s30 como ajuste$/ }));

    // Assert
    await waitFor(() =>
      expect(calls.some((call) => call.key === "POST /api/statements/st-nov/adjustment")).toBe(
        true,
      ),
    );
    expect(calls.find((call) => call.key.endsWith("/adjustment"))?.body).toEqual({
      currency: "ARS",
    });
  });

  it("explains a rejected adjustment", async () => {
    // Arrange
    const withDifference = detailOf({
      totals: [
        totals("ARS", { totalMinor: 100_00, bankTotalMinor: 130_00, differenceMinor: 30_00 }),
        totals("USD"),
      ],
    });
    stubApi({
      ...lookups,
      "GET /api/statements?accountId=card-1": { body: { items: [summaryOf(withDifference)] } },
      "GET /api/statements/st-nov": { body: withDifference },
      "POST /api/statements/st-nov/adjustment": {
        status: 400,
        body: { error: "invalid_request", reason: "no_positive_difference" },
      },
    });
    const user = userEvent.setup();
    screenAt(
      "/accounts/card-1/statement",
      <StatementContainer />,
      "/accounts/:accountId/statement",
    );

    // Act
    await user.click(await screen.findByRole("button", { name: /como ajuste/ }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain("nada para ajustar");
  });

  it("explains a card without closing and due days", async () => {
    // Arrange
    stubApi({ ...lookups, "GET /api/statements?accountId=card-1": { body: { items: [] } } });

    // Act
    screenAt(
      "/accounts/card-1/statement",
      <StatementContainer />,
      "/accounts/:accountId/statement",
    );

    // Assert
    expect(await screen.findByText(/no tiene día de cierre ni de vencimiento/)).toBeDefined();
  });

  it("says when the card does not exist and when loading fails", async () => {
    // Arrange
    stubApi({ ...lookups, "GET /api/accounts": { body: [bank] } });

    // Act
    screenAt(
      "/accounts/card-1/statement",
      <StatementContainer />,
      "/accounts/:accountId/statement",
    );

    // Assert
    expect(await screen.findByText("No encontramos esta tarjeta.")).toBeDefined();
  });

  it("offers to retry when the statement cannot be loaded", async () => {
    // Arrange
    stubApi({ "GET /api/accounts": { body: [card] }, "GET /api/people": { body: [] } });

    // Act
    screenAt(
      "/accounts/card-1/statement",
      <StatementContainer />,
      "/accounts/:accountId/statement",
    );

    // Assert
    expect(await screen.findByText("No pudimos cargar el resumen.")).toBeDefined();
    expect(screen.getByRole("button", { name: "Reintentar" })).toBeDefined();
  });
});

describe("PayStatementContainer", () => {
  const route = "/accounts/:accountId/statement/pay";
  const path = "/accounts/card-1/statement/pay?period=2026-11";

  it("prefills the total in pesos and dollars and pays from the chosen account", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "POST /api/statements/st-nov/payments": { status: 201, body: november },
    });
    const user = userEvent.setup();
    screenAt(path, <PayStatementContainer />, route);

    // Act
    const submit = await screen.findByRole("button", { name: /^Pagar \$\s504\.900 \+ US\$\s35$/ });
    await user.click(submit);

    // Assert
    await waitFor(() =>
      expect(calls.find((call) => call.key.endsWith("/payments"))?.body).toEqual({
        fromAccountId: "bank-1",
        occurredOn: "2026-12-05",
        arsMinor: 504_900_00,
        usdMinor: 35_00,
        usdSource: "usd",
        usdSourceAmountMinor: null,
      }),
    );
  });

  it("pays the minimum", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "POST /api/statements/st-nov/payments": { status: 201, body: november },
    });
    const user = userEvent.setup();
    screenAt(path, <PayStatementContainer />, route);
    await screen.findByRole("button", { name: /^Pagar \$/ });

    // Act
    await user.click(screen.getByRole("radio", { name: "Mínimo" }));
    await user.click(screen.getByRole("button", { name: /^Pagar \$\s50\.000/ }));

    // Assert
    await waitFor(() =>
      expect(calls.find((call) => call.key.endsWith("/payments"))?.body).toMatchObject({
        arsMinor: 50_000_00,
        usdMinor: 0,
      }),
    );
  });

  it("pays another amount and the dollars with pesos", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "POST /api/statements/st-nov/payments": { status: 201, body: november },
    });
    const user = userEvent.setup();
    screenAt(path, <PayStatementContainer />, route);
    await screen.findByRole("button", { name: /^Pagar \$/ });

    // Act
    await user.click(screen.getByRole("radio", { name: "Otro monto" }));
    await user.type(screen.getByLabelText("Monto en pesos"), "1000");
    await user.type(screen.getByLabelText("Monto en dólares"), "20");
    await user.click(screen.getByRole("switch", { name: "Pagar los dólares con pesos" }));
    await user.type(screen.getByLabelText("Pesos que se descuentan"), "25000");
    await user.click(screen.getByRole("button", { name: /^Pagar \$\s1\.000/ }));

    // Assert
    await waitFor(() =>
      expect(calls.find((call) => call.key.endsWith("/payments"))?.body).toEqual({
        fromAccountId: "bank-1",
        occurredOn: "2026-12-05",
        arsMinor: 1000_00,
        usdMinor: 20_00,
        usdSource: "ars",
        usdSourceAmountMinor: 25_000_00,
      }),
    );
  });

  it("asks for an exchange amount before paying dollars with pesos", async () => {
    // Arrange
    const { calls } = stubApi(lookups);
    const user = userEvent.setup();
    screenAt(path, <PayStatementContainer />, route);
    await screen.findByRole("button", { name: /^Pagar \$/ });

    // Act
    await user.click(screen.getByRole("switch", { name: "Pagar los dólares con pesos" }));
    await user.click(screen.getByRole("button", { name: /^Pagar \$/ }));

    // Assert
    expect(await screen.findByText("Ingresá cuántos pesos se descuentan.")).toBeDefined();
    expect(calls.some((call) => call.key.endsWith("/payments"))).toBe(false);
  });

  it("explains a payment the server rejects", async () => {
    // Arrange
    stubApi({
      ...lookups,
      "POST /api/statements/st-nov/payments": {
        status: 400,
        body: { error: "invalid_request", reason: "currency_not_in_account" },
      },
    });
    const user = userEvent.setup();
    screenAt(path, <PayStatementContainer />, route);

    // Act
    await user.click(await screen.findByRole("button", { name: /^Pagar \$/ }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe("Esa cuenta no tiene esa moneda.");
  });

  it("asks for a source account when none can pay", async () => {
    // Arrange
    stubApi({ ...lookups, "GET /api/accounts": { body: [card] } });
    const user = userEvent.setup();
    screenAt(path, <PayStatementContainer />, route);

    // Act
    await user.click(await screen.findByRole("button", { name: /^Pagar \$/ }));

    // Assert
    expect(await screen.findByText("Elegí desde qué cuenta pagás.")).toBeDefined();
  });
});

describe("ChargeFormContainer", () => {
  const newRoute = "/accounts/:accountId/statement/charge";
  const editRoute = "/accounts/:accountId/statement/charges/:movementId";

  it("adds a charge with a Financial charges category", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "POST /api/statements/st-nov/charges": { status: 201, body: november },
    });
    const user = userEvent.setup();
    screenAt("/accounts/card-1/statement/charge?period=2026-11", <ChargeFormContainer />, newRoute);

    // Act
    await user.selectOptions(await screen.findByLabelText("Categoría"), "cat-interest");
    await user.type(screen.getByLabelText("Monto"), "36600");
    await user.type(screen.getByLabelText("Descripción (opcional)"), "Late interest");
    await user.click(screen.getByRole("button", { name: "Guardar cargo" }));

    // Assert
    await waitFor(() =>
      expect(calls.find((call) => call.key.endsWith("/charges"))?.body).toEqual({
        categoryId: "cat-interest",
        currency: "ARS",
        amountMinor: 36_600_00,
        description: "Late interest",
        occurredOn: "2026-11-27",
      }),
    );
  });

  it("does not offer deactivated categories and validates the form", async () => {
    // Arrange
    const { calls } = stubApi(lookups);
    const user = userEvent.setup();
    screenAt("/accounts/card-1/statement/charge?period=2026-11", <ChargeFormContainer />, newRoute);
    const select = await screen.findByLabelText("Categoría");

    // Act
    await user.click(screen.getByRole("button", { name: "Guardar cargo" }));

    // Assert
    expect(within(select).queryByRole("option", { name: "Comisiones" })).toBeNull();
    expect(await screen.findByText("Elegí una categoría.")).toBeDefined();
    expect(screen.getByText("Ingresá un monto mayor a cero.")).toBeDefined();
    expect(calls.some((call) => call.key.startsWith("POST"))).toBe(false);
  });

  it("switches the currency of a charge on a card with dollars", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "POST /api/statements/st-nov/charges": { status: 201, body: november },
    });
    const user = userEvent.setup();
    screenAt("/accounts/card-1/statement/charge?period=2026-11", <ChargeFormContainer />, newRoute);

    // Act
    await user.click(await screen.findByRole("button", { name: "USD" }));
    await user.selectOptions(screen.getByLabelText("Categoría"), "cat-interest");
    await user.type(screen.getByLabelText("Monto"), "5");
    await user.click(screen.getByRole("button", { name: "Guardar cargo" }));

    // Assert
    await waitFor(() =>
      expect(calls.find((call) => call.key.endsWith("/charges"))?.body).toMatchObject({
        currency: "USD",
        amountMinor: 5_00,
      }),
    );
  });

  it("edits and deletes an existing charge", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "PUT /api/statements/st-nov/charges/ch1": { body: november },
      "DELETE /api/statements/st-nov/charges/ch1": { body: november },
    });
    const user = userEvent.setup();
    screenAt(
      "/accounts/card-1/statement/charges/ch1?period=2026-11",
      <ChargeFormContainer />,
      editRoute,
    );
    const amount = await screen.findByLabelText("Monto");
    await waitFor(() => expect((amount as HTMLInputElement).value).toBe("36600"));

    // Act
    await user.clear(amount);
    await user.type(amount, "100");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    await waitFor(() => expect(calls.some((call) => call.key.startsWith("PUT"))).toBe(true));

    // Assert
    expect(calls.find((call) => call.key.startsWith("PUT"))?.body).toMatchObject({
      amountMinor: 100_00,
      description: "Late interest",
    });
  });

  it("asks for confirmation before deleting a charge", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "DELETE /api/statements/st-nov/charges/ch1": { body: november },
    });
    const user = userEvent.setup();
    screenAt(
      "/accounts/card-1/statement/charges/ch1?period=2026-11",
      <ChargeFormContainer />,
      editRoute,
    );

    // Act
    await user.click(await screen.findByRole("button", { name: "Eliminar cargo" }));
    await user.click(await screen.findByRole("button", { name: "Confirmar" }));

    // Assert
    await waitFor(() => expect(calls.some((call) => call.key.startsWith("DELETE"))).toBe(true));
  });

  it("says when the charge does not exist", async () => {
    // Arrange
    stubApi(lookups);

    // Act
    screenAt(
      "/accounts/card-1/statement/charges/other?period=2026-11",
      <ChargeFormContainer />,
      editRoute,
    );

    // Assert
    expect(await screen.findByText("No encontramos ese cargo.")).toBeDefined();
  });

  it("explains a charge the server rejects", async () => {
    // Arrange
    stubApi({
      ...lookups,
      "POST /api/statements/st-nov/charges": {
        status: 400,
        body: { error: "invalid_request", reason: "category_not_allowed" },
      },
    });
    const user = userEvent.setup();
    screenAt("/accounts/card-1/statement/charge?period=2026-11", <ChargeFormContainer />, newRoute);

    // Act
    await user.selectOptions(await screen.findByLabelText("Categoría"), "cat-interest");
    await user.type(screen.getByLabelText("Monto"), "10");
    await user.click(screen.getByRole("button", { name: "Guardar cargo" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe(
      "Elegí una categoría de cargos financieros.",
    );
  });
});

describe("ReconcileContainer", () => {
  const route = "/accounts/:accountId/statement/reconcile";

  it("saves the bank total and the minimum", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookups,
      "PUT /api/statements/st-dec/bank-figures": { body: december },
    });
    const user = userEvent.setup();
    screenAt("/accounts/card-1/statement/reconcile?period=2026-12", <ReconcileContainer />, route);

    // Act
    await user.type(await screen.findByLabelText("Total del banco · ARS"), "504900");
    await user.type(screen.getByLabelText("Pago mínimo · ARS"), "50000");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    await waitFor(() =>
      expect(calls.find((call) => call.key.endsWith("/bank-figures"))?.body).toEqual({
        bankTotalArsMinor: 504_900_00,
        minimumArsMinor: 50_000_00,
        bankTotalUsdMinor: null,
        minimumUsdMinor: null,
      }),
    );
  });

  it("starts from the figures already saved and flags unreadable amounts", async () => {
    // Arrange
    const { calls } = stubApi(lookups);
    const user = userEvent.setup();
    screenAt("/accounts/card-1/statement/reconcile?period=2026-11", <ReconcileContainer />, route);
    const total = await screen.findByLabelText("Total del banco · ARS");
    await waitFor(() => expect((total as HTMLInputElement).value).toBe("504900"));

    // Act
    await user.clear(total);
    await user.type(total, "abc");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByText("Ingresá un monto válido.")).toBeDefined();
    expect(calls.some((call) => call.key.startsWith("PUT"))).toBe(false);
  });

  it("shows the app's calculation and explains a failed save", async () => {
    // Arrange
    stubApi({
      ...lookups,
      "PUT /api/statements/st-nov/bank-figures": { status: 500, body: { error: "boom" } },
    });
    const user = userEvent.setup();
    screenAt("/accounts/card-1/statement/reconcile?period=2026-11", <ReconcileContainer />, route);

    // Act
    await user.click(await screen.findByRole("button", { name: "Guardar" }));

    // Assert
    expect(screen.getAllByText("Cálculo de la app: $ 504.900").length).toBeGreaterThan(0);
    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos guardar. Probá de nuevo.",
    );
  });
});
