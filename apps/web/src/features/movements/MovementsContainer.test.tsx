import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { lookupHandlers, makeMovement } from "../../test/fake-movements";
import { renderApp } from "../../test/render";
import { MovementsContainer } from "./MovementsContainer";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const month = "GET /api/movements?from=2026-11-01&to=2026-11-30&limit=30&offset=0";

const heladera = makeMovement({
  id: "m-heladera",
  occurredOn: "2026-11-25",
  description: "Heladera",
  categoryId: "cat-maintenance",
  installments: [
    {
      number: 1,
      periodMonth: "2026-12",
      statementId: null,
      amountMinor: 300_000_00,
      ownAmountMinor: 300_000_00,
    },
    {
      number: 2,
      periodMonth: "2027-01",
      statementId: null,
      amountMinor: 300_000_00,
      ownAmountMinor: 300_000_00,
    },
    {
      number: 3,
      periodMonth: "2027-02",
      statementId: null,
      amountMinor: 300_000_00,
      ownAmountMinor: 300_000_00,
    },
  ],
});
const coto = makeMovement();
const zapatillas = makeMovement({
  id: "m-zapatillas",
  description: "Zapatillas de Juan",
  person: { personId: "acc-juan", ownAmountMinor: 0 },
  installments: [
    {
      number: 1,
      periodMonth: "2026-11",
      statementId: null,
      amountMinor: 120_000_00,
      ownAmountMinor: 0,
    },
  ],
  account: { accountId: "acc-visa", currency: "ARS", amountMinor: 120_000_00 },
});
const dollars = makeMovement({
  id: "m-usd",
  type: "transfer",
  occurredOn: "2026-11-24",
  categoryId: null,
  account: null,
  installments: [],
  description: "Compra de dólares",
  from: { accountId: "acc-cash", currency: "ARS", amountMinor: 1_230_000_00 },
  to: { accountId: "acc-cash", currency: "USD", amountMinor: 1_000_00 },
});

function listOf(items: unknown[], hasMore = false) {
  return { body: { items, hasMore } };
}

function text(element: HTMLElement) {
  return (element.textContent ?? "").replaceAll(" ", " ");
}

describe("MovementsContainer", () => {
  it("groups the month's movements by day with installment tags and loans", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [month]: listOf([heladera, coto, zapatillas, dollars]) });

    // Act
    renderApp(<MovementsContainer />, "es");
    const today = await screen.findByRole("region", { name: "Hoy, 25 nov" });

    // Assert
    expect(within(today).getByText("Heladera")).toBeDefined();
    expect(within(today).getByText("1/3")).toBeDefined();
    expect(text(today)).toContain("− $ 300.000");
    const yesterday = screen.getByRole("region", { name: "Ayer, 24 nov" });
    expect(within(yesterday).getByText("Coto")).toBeDefined();
    expect(within(yesterday).getByText("Juan")).toBeDefined();
    expect(within(yesterday).getByText("no es gasto")).toBeDefined();
    expect(
      within(yesterday).getByText("Galicia → Galicia US$".replace(/Galicia/g, "Efectivo")),
    ).toBeDefined();
    expect(text(yesterday)).toContain("US$ 1.000");
    const link = within(today).getByRole("link", { name: /Heladera/ });
    expect(link.getAttribute("href")).toBe("/movements/m-heladera/edit");
  });

  it("searches by description after a short pause", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      [month]: listOf([coto]),
      "GET /api/movements?q=plumber&from=2026-11-01&to=2026-11-30&limit=30&offset=0": listOf([]),
    });
    renderApp(<MovementsContainer />, "es");
    await screen.findByText("Coto");

    // Act
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Buscar por descripción" }),
      "plumber",
    );

    // Assert
    expect(await screen.findByText("No hay movimientos")).toBeDefined();
    expect(calls.some((call) => call.key.includes("q=plumber"))).toBe(true);
  });

  it("clears the period in one tap and combines filters from the panel", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      [month]: listOf([coto]),
      "GET /api/movements?limit=30&offset=0": listOf([coto, dollars]),
      "GET /api/movements?type=expense&limit=30&offset=0": listOf([coto]),
    });
    renderApp(<MovementsContainer />, "es");
    await screen.findByText("Coto");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Noviembre" }));
    await screen.findByText("Compra de dólares");
    await userEvent.click(screen.getByRole("button", { name: "Filtros" }));
    await userEvent.selectOptions(screen.getByLabelText("Tipo"), "expense");

    // Assert
    expect(await screen.findByRole("button", { name: "Gasto" })).toBeDefined();
    expect(calls.map((call) => call.key)).toContain(
      "GET /api/movements?type=expense&limit=30&offset=0",
    );
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(screen.queryByRole("button", { name: "Gasto" })).toBeNull();
  });

  it("loads the next page", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      [month]: listOf([coto], true),
      "GET /api/movements?from=2026-11-01&to=2026-11-30&limit=30&offset=1": listOf([
        makeMovement({ id: "m-older", description: "Older one", occurredOn: "2026-11-02" }),
      ]),
    });
    renderApp(<MovementsContainer />, "es");
    await screen.findByText("Coto");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Ver más" }));

    // Assert
    expect(await screen.findByText("Older one")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Ver más" })).toBeNull();
  });

  it("offers a retry when the list cannot be loaded", async () => {
    // Arrange
    stubApi({ ...lookupHandlers });
    renderApp(<MovementsContainer />, "es");

    // Act
    const retry = await screen.findByRole("button", { name: "Reintentar" });

    // Assert
    expect(screen.getByText("No pudimos cargar los movimientos.")).toBeDefined();
    expect(retry).toBeDefined();
  });

  it("shows the empty state when nothing matches", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [month]: listOf([]) });

    // Act
    renderApp(<MovementsContainer />, "es");

    // Assert
    expect(await screen.findByText("No hay movimientos")).toBeDefined();
  });
});
