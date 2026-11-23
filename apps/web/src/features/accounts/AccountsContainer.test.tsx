import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { galicia, makeAccount, stubApi } from "../../test/fake-api";
import { renderApp } from "../../test/render";
import { AccountsContainer } from "./AccountsContainer";

afterEach(() => {
  vi.unstubAllGlobals();
});

const accounts = [
  makeAccount({
    id: "bank",
    type: "bank",
    name: "Galicia",
    institution: galicia,
    currencies: [
      { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 2_410_000_00 },
      { currency: "USD", openingBalanceMinor: 0, balanceMinor: 1_000_00 },
    ],
  }),
  makeAccount({
    id: "cash",
    type: "cash",
    name: null,
    nameKey: "defaults.account.cash",
    currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: 41_000_00 }],
  }),
  makeAccount({
    id: "card",
    type: "credit_card",
    name: "Visa Galicia",
    closingDay: 27,
    dueDay: 5,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: -1_104_900_00 }],
  }),
  makeAccount({
    id: "closed",
    type: "bank",
    name: "Closed bank",
    isActive: false,
  }),
];

const people = [
  makeAccount({
    id: "juan",
    type: "person",
    name: "Juan",
    currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: 220_000_00 }],
  }),
  makeAccount({
    id: "sofi",
    type: "person",
    name: "Sofi",
    currencies: [{ currency: "USD", openingBalanceMinor: 0, balanceMinor: -200_00 }],
  }),
];

describe("AccountsContainer", () => {
  it("groups accounts into money, cards, people and inactive sections", async () => {
    // Arrange
    stubApi({
      "GET /api/accounts": { body: accounts },
      "GET /api/people": { body: people },
    });

    // Act
    renderApp(<AccountsContainer />, "es");
    const money = await screen.findByRole("region", { name: "Dinero" });

    // Assert
    expect(within(money).getByText("Galicia")).toBeDefined();
    expect(within(money).getByText("Banco · ARS y USD")).toBeDefined();
    expect(within(money).getByText("US$ 1.000")).toBeDefined();
    expect(
      within(money).getByText("Efectivo", { selector: ".movement-row__title-text" }),
    ).toBeDefined();
    const cards = screen.getByRole("region", { name: "Tarjetas" });
    expect(within(cards).getByText("Cierra el 27 · vence el 5")).toBeDefined();
    expect(within(cards).getByText("− $ 1.104.900")).toBeDefined();
    expect(within(cards).getByText("deuda total")).toBeDefined();
    const group = screen.getByRole("region", { name: "Personas" });
    expect(within(group).getByText("Te debe")).toBeDefined();
    expect(within(group).getByText("Le debés")).toBeDefined();
    expect(within(group).getByText("+ $ 220.000")).toBeDefined();
    expect(within(group).getByText("US$ 200")).toBeDefined();
    const inactive = screen.getByRole("region", { name: "Inactivas" });
    expect(within(inactive).getByText("Closed bank")).toBeDefined();
  });

  it("links every row to its edit form and offers adding an account", async () => {
    // Arrange
    stubApi({ "GET /api/accounts": { body: accounts }, "GET /api/people": { body: people } });

    // Act
    renderApp(<AccountsContainer />, "es");
    const row = await screen.findByRole("link", { name: /^Galicia/ });

    // Assert
    expect(row.getAttribute("href")).toBe("/accounts/bank/edit");
    expect(screen.getByRole("link", { name: "Agregar" }).getAttribute("href")).toBe(
      "/accounts/new",
    );
  });

  it("translates the default cash account name", async () => {
    // Arrange
    stubApi({ "GET /api/accounts": { body: accounts }, "GET /api/people": { body: people } });

    // Act
    renderApp(<AccountsContainer />, "en");

    // Assert
    expect(
      await screen.findByText("Cash", { selector: ".movement-row__title-text" }),
    ).toBeDefined();
    expect(screen.getByText("Closes on 27 · due on 5")).toBeDefined();
  });

  it("shows an empty state when there are no accounts", async () => {
    // Arrange
    stubApi({ "GET /api/accounts": { body: [] }, "GET /api/people": { body: [] } });

    // Act
    renderApp(<AccountsContainer />, "es");

    // Assert
    expect(await screen.findByText("Todavía no hay cuentas")).toBeDefined();
  });

  it("shows an error and retries", async () => {
    // Arrange
    stubApi({});
    renderApp(<AccountsContainer />, "es");
    expect(await screen.findByText("No pudimos cargar tus cuentas.")).toBeDefined();
    stubApi({ "GET /api/accounts": { body: accounts }, "GET /api/people": { body: people } });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    // Assert
    expect(await screen.findByText("Visa Galicia")).toBeDefined();
  });

  it("describes a person with balances in both directions", async () => {
    // Arrange
    const both = makeAccount({
      id: "both",
      type: "person",
      name: "Mixed",
      currencies: [
        { currency: "ARS", openingBalanceMinor: 0, balanceMinor: 100_00 },
        { currency: "USD", openingBalanceMinor: 0, balanceMinor: -50_00 },
      ],
    });
    const settled = makeAccount({
      id: "settled",
      type: "person",
      name: "Even",
      currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 }],
    });
    stubApi({ "GET /api/accounts": { body: [] }, "GET /api/people": { body: [both, settled] } });

    // Act
    renderApp(<AccountsContainer />, "es");

    // Assert
    expect(await screen.findByText("Saldos en ambos sentidos")).toBeDefined();
    expect(screen.getByText("Sin saldo")).toBeDefined();
  });
});
