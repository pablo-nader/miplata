import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyBalance, stubApi } from "../../test/fake-api";
import { renderApp } from "../../test/render";
import { BalanceContainer } from "./BalanceContainer";

afterEach(() => {
  vi.unstubAllGlobals();
});

const balance = {
  totals: [
    { currency: "ARS", totalMinor: 1_884_300_00 },
    { currency: "USD", totalMinor: 1_450_00 },
  ],
  lines: [
    {
      accountId: "a",
      type: "bank",
      name: "Galicia",
      nameKey: null,
      institution: null,
      currency: "ARS",
      balanceMinor: 2_410_000_00,
    },
    {
      accountId: "b",
      type: "wallet",
      name: "Mercado Pago",
      nameKey: null,
      institution: null,
      currency: "ARS",
      balanceMinor: 318_200_00,
    },
    {
      accountId: "c",
      type: "cash",
      name: null,
      nameKey: "defaults.account.cash",
      institution: null,
      currency: "ARS",
      balanceMinor: 41_000_00,
    },
    {
      accountId: "d",
      type: "credit_card",
      name: "Visa Galicia",
      nameKey: null,
      institution: null,
      currency: "ARS",
      balanceMinor: -1_104_900_00,
    },
    {
      accountId: "e",
      type: "person",
      name: "Juan",
      nameKey: null,
      institution: null,
      currency: "ARS",
      balanceMinor: 220_000_00,
    },
    {
      accountId: "f",
      type: "person",
      name: "Sofi",
      nameKey: null,
      institution: null,
      currency: "ARS",
      balanceMinor: -10_00,
    },
    {
      accountId: "g",
      type: "person",
      name: "Even",
      nameKey: null,
      institution: null,
      currency: "ARS",
      balanceMinor: 0,
    },
    {
      accountId: "a",
      type: "bank",
      name: "Galicia",
      nameKey: null,
      institution: null,
      currency: "USD",
      balanceMinor: 1_000_00,
    },
    {
      accountId: "c",
      type: "cash",
      name: null,
      nameKey: "defaults.account.cash",
      institution: null,
      currency: "USD",
      balanceMinor: 450_00,
    },
  ],
};

describe("BalanceContainer", () => {
  it("shows each account per currency under the currency total", async () => {
    // Arrange
    stubApi({ "GET /api/balance": { body: balance } });

    // Act
    renderApp(<BalanceContainer />, "es");
    const pesos = await screen.findByRole("region", { name: /^Pesos · \$.1\.884\.300$/ });

    // Assert
    expect(within(pesos).getByText("Galicia")).toBeDefined();
    expect(within(pesos).getByText("Banco")).toBeDefined();
    expect(within(pesos).getByText("Billetera")).toBeDefined();
    expect(
      within(pesos).getByText("Efectivo", { selector: ".movement-row__title-text" }),
    ).toBeDefined();
    expect(within(pesos).getByText("Tarjeta · deuda")).toBeDefined();
    expect(within(pesos).getByText("− $ 1.104.900")).toBeDefined();
    expect(within(pesos).getByText("Te debe")).toBeDefined();
    expect(within(pesos).getByText("+ $ 220.000")).toBeDefined();
    expect(within(pesos).getByText("Le debés")).toBeDefined();
    expect(within(pesos).getByText("Sin saldo")).toBeDefined();
    const dollars = screen.getByRole("region", { name: /^Dólares · US\$.1\.450$/ });
    expect(within(dollars).getByText("US$ 1.000")).toBeDefined();
    expect(within(dollars).getByText("US$ 450")).toBeDefined();
  });

  it("links back to the home screen", async () => {
    // Arrange
    stubApi({ "GET /api/balance": { body: balance } });

    // Act
    renderApp(<BalanceContainer />, "es");
    await screen.findByRole("region", { name: /Pesos/ });

    // Assert
    expect(screen.getByRole("link", { name: "Volver al inicio" }).getAttribute("href")).toBe(
      "/home",
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Saldo total");
  });

  it("shows an empty state without accounts", async () => {
    // Arrange
    stubApi({ "GET /api/balance": { body: emptyBalance } });

    // Act
    renderApp(<BalanceContainer />, "en");

    // Assert
    expect(await screen.findByText("There are no accounts with a balance yet.")).toBeDefined();
  });

  it("shows an error and retries", async () => {
    // Arrange
    stubApi({});
    renderApp(<BalanceContainer />, "en");
    expect(await screen.findByText("We could not load the balance.")).toBeDefined();
    stubApi({ "GET /api/balance": { body: balance } });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Assert
    expect(await screen.findByRole("region", { name: /^Pesos/ })).toBeDefined();
  });
});
