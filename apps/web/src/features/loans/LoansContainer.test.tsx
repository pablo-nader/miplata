import type { LoansResponse } from "@miplata/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { renderApp } from "../../test/render";
import { LoansContainer } from "./LoansContainer";

afterEach(() => {
  vi.unstubAllGlobals();
});

const loans: LoansResponse = {
  owesYou: [
    {
      personId: "juan",
      name: "Juan",
      isActive: true,
      lines: [
        {
          currency: "ARS",
          amountMinor: 70_000_00,
          dueNowMinor: 20_000_00,
          pendingTotalMinor: 50_000_00,
        },
        { currency: "USD", amountMinor: 50_00, dueNowMinor: 0, pendingTotalMinor: 0 },
      ],
    },
    {
      personId: "sofi",
      name: "Sofi",
      isActive: true,
      lines: [{ currency: "ARS", amountMinor: 1_000_00, dueNowMinor: 0, pendingTotalMinor: 0 }],
    },
  ],
  youOwe: [
    {
      personId: "ana",
      name: "Ana",
      isActive: true,
      lines: [{ currency: "ARS", amountMinor: 3_000_00, dueNowMinor: 0, pendingTotalMinor: 0 }],
    },
  ],
  owedToYouTotals: [
    { currency: "ARS", amountMinor: 71_000_00 },
    { currency: "USD", amountMinor: 50_00 },
  ],
  youOweTotals: [{ currency: "ARS", amountMinor: 3_000_00 }],
};

const empty: LoansResponse = { owesYou: [], youOwe: [], owedToYouTotals: [], youOweTotals: [] };

describe("LoansContainer", () => {
  it("lists who owes the user and whom the user owes with their totals", async () => {
    // Arrange
    stubApi({ "GET /api/loans": { body: loans } });

    // Act
    renderApp(<LoansContainer />, "es");
    const owesYou = await screen.findByRole("region", { name: "Te deben" });
    const youOwe = screen.getByRole("region", { name: "Debés" });

    // Assert
    expect(within(owesYou).getByText("$ 71.000 · US$ 50")).toBeDefined();
    expect(within(owesYou).getByText("Juan")).toBeDefined();
    expect(within(owesYou).getByText("+ $ 70.000")).toBeDefined();
    expect(within(owesYou).getByText("+ US$ 50")).toBeDefined();
    expect(within(owesYou).getByText("Sofi")).toBeDefined();
    expect(within(youOwe).getAllByText("$ 3.000")).toHaveLength(2);
    expect(within(youOwe).getByText("Ana")).toBeDefined();
    expect(within(youOwe).getByText("Le debés")).toBeDefined();
  });

  it("shows what is due on the current statement and what is pending in total", async () => {
    // Arrange
    stubApi({ "GET /api/loans": { body: loans } });

    // Act
    renderApp(<LoansContainer />, "es");
    const owesYou = await screen.findByRole("region", { name: "Te deben" });

    // Assert
    expect(within(owesYou).getByText("En este resumen: $ 20.000")).toBeDefined();
    expect(within(owesYou).getByText("Pendiente en total: $ 50.000")).toBeDefined();
    expect(within(owesYou).getAllByText(/En este resumen/)).toHaveLength(1);
  });

  it("opens the person's detail when tapping a row", async () => {
    // Arrange
    stubApi({ "GET /api/loans": { body: loans } });

    // Act
    renderApp(<LoansContainer />, "es");
    const row = await screen.findByRole("link", { name: /Ana/ });

    // Assert
    expect(row.getAttribute("href")).toBe("/loans/ana");
  });

  it("shows an empty message for each group", async () => {
    // Arrange
    stubApi({ "GET /api/loans": { body: empty } });

    // Act
    renderApp(<LoansContainer />, "es");

    // Assert
    expect(await screen.findByText("Nadie te debe plata por ahora.")).toBeDefined();
    expect(screen.getByText("No le debés plata a nadie.")).toBeDefined();
  });

  it("links back to the accounts screen", async () => {
    // Arrange
    stubApi({ "GET /api/loans": { body: empty } });

    // Act
    renderApp(<LoansContainer />, "en");
    await screen.findByText("Nobody owes you money right now.");

    // Assert
    expect(screen.getByRole("link", { name: "Back to Accounts" }).getAttribute("href")).toBe(
      "/accounts",
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Loans");
  });

  it("shows an error and retries", async () => {
    // Arrange
    stubApi({});
    renderApp(<LoansContainer />, "en");
    expect(await screen.findByText("We could not load the loans.")).toBeDefined();
    stubApi({ "GET /api/loans": { body: loans } });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Assert
    expect(await screen.findByRole("region", { name: "Owe you" })).toBeDefined();
  });
});
