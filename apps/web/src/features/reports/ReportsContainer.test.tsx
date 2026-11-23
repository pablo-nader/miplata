import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeAccount, stubApi } from "../../test/fake-api";
import { createFakeCategoriesBackend } from "../../test/fake-categories-backend";
import { renderApp } from "../../test/render";
import { ReportsContainer } from "./ReportsContainer";

const backend = createFakeCategoriesBackend();
const catalog = backend.handle("GET", "/api/categories").body;
const idOf = (nameKey: string) =>
  backend.categories.find((item) => item.nameKey === nameKey)?.id as string;
const housingGroup = backend.groups[0]?.id as string;
const rent = idOf("defaults.category.rent");
const groceries = idOf("defaults.category.groceries");
const salary = idOf("defaults.income.salary");

const base = {
  "GET /api/categories": { body: catalog },
  "GET /api/accounts": {
    body: [makeAccount({ id: "bank-1", type: "bank", name: "Galicia" })],
  },
  "GET /api/people": { body: [] },
};

const spending = {
  month: "2026-11",
  currency: "ARS",
  totalMinor: 100_000_00,
  groups: [
    {
      groupId: housingGroup,
      totalMinor: 75_000_00,
      sharePercent: 75,
      categories: [{ categoryId: rent, totalMinor: 75_000_00, sharePercent: 100 }],
    },
    {
      groupId: null,
      totalMinor: 25_000_00,
      sharePercent: 25,
      categories: [{ categoryId: groceries, totalMinor: 25_000_00, sharePercent: 100 }],
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 15));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function open(language: "es" | "en" = "es") {
  return renderApp(<ReportsContainer />, language);
}

describe("spending report", () => {
  it("lists groups largest first and drills down to categories and movements", async () => {
    // Arrange
    const { calls } = stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      [`GET /api/reports/spending/movements?month=2026-11&currency=ARS&categoryId=${rent}`]: {
        body: {
          items: [
            {
              movementId: "m1",
              occurredOn: "2026-11-05",
              description: "November rent",
              categoryId: rent,
              ownAmountMinor: 75_000_00,
              installmentNumber: 2,
              installmentCount: 3,
            },
          ],
        },
      },
    });
    open();

    // Act
    const group = await screen.findByRole("button", { name: /Vivienda/ });
    const ungrouped = screen.getByRole("button", { name: /Sin grupo/ });
    await userEvent.click(group);
    await userEvent.click(await screen.findByRole("button", { name: /Alquiler/ }));

    // Assert
    expect(group.getAttribute("aria-label")).toContain("75 %");
    expect(ungrouped.getAttribute("aria-label")).toContain("25 %");
    expect(await screen.findByText("November rent")).toBeTruthy();
    expect(screen.getByText(/cuota 2 de 3/)).toBeTruthy();
    expect(calls.map((call) => call.key)).toContain(
      `GET /api/reports/spending/movements?month=2026-11&currency=ARS&categoryId=${rent}`,
    );
  });

  it("goes back one level at a time", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      [`GET /api/reports/spending/movements?month=2026-11&currency=ARS&categoryId=${rent}`]: {
        body: { items: [] },
      },
    });
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Vivienda/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Alquiler/ }));

    // Act
    await userEvent.click(await screen.findByRole("button", { name: /Vivienda/ }));
    const categoriesBack = await screen.findByRole("button", { name: "Todos los grupos" });
    await userEvent.click(categoriesBack);

    // Assert
    expect(await screen.findByRole("button", { name: /Sin grupo/ })).toBeTruthy();
  });

  it("shows an empty message when there are no expenses", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": {
        body: { ...spending, totalMinor: 0, groups: [] },
      },
    });

    // Act
    open();

    // Assert
    expect(await screen.findByText("No hay gastos en este mes.")).toBeTruthy();
  });

  it("offers a retry when the report fails", async () => {
    // Arrange
    const key = "GET /api/reports/spending?month=2026-11&currency=ARS";
    const { calls } = stubApi({ ...base, [key]: { status: 500, body: { error: "boom" } } });
    open();
    const retry = await screen.findByRole("button", { name: "Reintentar" });

    // Act
    await userEvent.click(retry);

    // Assert
    await waitFor(() => expect(calls.filter((call) => call.key === key)).toHaveLength(2));
    expect(await screen.findByText("No pudimos cargar el reporte.")).toBeTruthy();
  });
});

describe("category catalog", () => {
  it("does not label rows until the catalog loads and offers a retry when it fails", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/categories": { status: 500, body: { error: "boom" } },
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
    });

    // Act
    open();

    // Assert
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeTruthy();
    expect(screen.queryByText(/Categoría eliminada/)).toBeNull();
  });
});

describe("movements drill-down errors", () => {
  it("shows the load failure and retries the movements request", async () => {
    // Arrange
    const key = `GET /api/reports/spending/movements?month=2026-11&currency=ARS&categoryId=${rent}`;
    const { calls } = stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      [key]: { status: 500, body: { error: "boom" } },
    });
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Vivienda/ }));
    await userEvent.click(await screen.findByRole("button", { name: /Alquiler/ }));

    // Act
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    await userEvent.click(retry);

    // Assert
    await waitFor(() => expect(calls.filter((call) => call.key === key).length).toBeGreaterThan(1));
  });
});

describe("filters", () => {
  it("reloads with the other currency, an account and a category", async () => {
    // Arrange
    const { calls } = stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      [`GET /api/reports/spending?month=2026-11&currency=USD&accountId=bank-1&categoryId=${salary}`]:
        { body: { ...spending, currency: "USD", totalMinor: 0, groups: [] } },
      "GET /api/reports/spending?month=2026-11&currency=USD": {
        body: { ...spending, currency: "USD", totalMinor: 0, groups: [] },
      },
    });
    open();
    await screen.findByRole("button", { name: /Vivienda/ });

    // Act
    await userEvent.click(screen.getByLabelText("Dólares"));
    await screen.findByText("No hay gastos en este mes.");
    await userEvent.selectOptions(await screen.findByLabelText("Cuenta"), "bank-1");
    await userEvent.selectOptions(screen.getByLabelText("Categoría"), salary);

    // Assert
    await waitFor(() =>
      expect(calls.map((call) => call.key)).toContain(
        `GET /api/reports/spending?month=2026-11&currency=USD&accountId=bank-1&categoryId=${salary}`,
      ),
    );
  });

  it("moves the report month with the stepper", async () => {
    // Arrange
    const { calls } = stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/spending?month=2026-10&currency=ARS": { body: spending },
    });
    open();
    await screen.findByRole("button", { name: /Vivienda/ });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));

    // Assert
    await waitFor(() =>
      expect(calls.map((call) => call.key)).toContain(
        "GET /api/reports/spending?month=2026-10&currency=ARS",
      ),
    );
    expect(screen.getByText("Octubre de 2026")).toBeTruthy();
  });
});

describe("month by month report", () => {
  const months = Array.from({ length: 12 }, (_, index) => ({
    month: `${index < 2 ? "2025" : "2026"}-${String(((index + 11) % 12) + 1).padStart(2, "0")}`,
    inMinor: index === 11 ? 200_000_00 : 0,
    outMinor: index === 11 ? 120_000_00 : 0,
    resultMinor: index === 11 ? 80_000_00 : 0,
  }));

  it("draws the chart and lists each month's result", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/monthly?to=2026-11&currency=ARS": {
        body: { currency: "ARS", months },
      },
    });
    open();

    // Act
    await userEvent.click(await screen.findByRole("tab", { name: "Mes a mes" }));

    // Assert
    expect(await screen.findByRole("img", { name: /Gráfico de barras/ })).toBeTruthy();
    const table = screen.getByRole("table");
    expect(within(table).getByText("+ $ 80.000")).toBeTruthy();
    expect(within(table).getAllByRole("row")).toHaveLength(13);
  });

  it("shows an empty message when nothing moved", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/monthly?to=2026-11&currency=ARS": {
        body: {
          currency: "ARS",
          months: months.map((item) => ({ ...item, inMinor: 0, outMinor: 0, resultMinor: 0 })),
        },
      },
    });
    open();

    // Act
    await userEvent.click(await screen.findByRole("tab", { name: "Mes a mes" }));

    // Assert
    expect(await screen.findByText("No hay movimientos en estos 12 meses.")).toBeTruthy();
  });
});

describe("what changed report", () => {
  it("shows the nominal warning, the percentage and the missing baseline", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/changes?month=2026-11&currency=ARS": {
        body: {
          month: "2026-11",
          currency: "ARS",
          categories: [
            {
              categoryId: rent,
              currentMinor: 125_000_00,
              previousAverageMinor: 100_000_00,
              percentChange: 25,
            },
            {
              categoryId: groceries,
              currentMinor: 10_000_00,
              previousAverageMinor: 0,
              percentChange: null,
            },
          ],
        },
      },
    });
    open();

    // Act
    await userEvent.click(await screen.findByRole("tab", { name: "Qué cambió" }));

    // Assert
    expect(await screen.findByText(/no descuenta la inflación/)).toBeTruthy();
    expect(screen.getByText("+25,0 % vs. el promedio")).toBeTruthy();
    expect(screen.getByText("Sin base de comparación")).toBeTruthy();
    expect(screen.getByText(/Prom\. 3 meses: \$ 100\.000/)).toBeTruthy();
  });
});

describe("committed report", () => {
  it("lists the coming months starting after the selected one", async () => {
    // Arrange
    const { calls } = stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/committed?from=2026-12&months=6&currency=ARS": {
        body: {
          currency: "ARS",
          months: [
            {
              month: "2026-12",
              installmentsMinor: 30_000_00,
              recurringMinor: 5_000_00,
              totalMinor: 35_000_00,
            },
            { month: "2027-01", installmentsMinor: 0, recurringMinor: 0, totalMinor: 0 },
          ],
        },
      },
    });
    open();

    // Act
    await userEvent.click(await screen.findByRole("tab", { name: "Comprometido" }));

    // Assert
    expect(await screen.findByText("Cuotas $ 30.000 · Recurrentes $ 5.000")).toBeTruthy();
    expect(screen.getByText("$ 35.000")).toBeTruthy();
    expect(screen.getByText(/Diciembre.* · ARS/)).toBeTruthy();
    expect(calls.map((call) => call.key)).toContain(
      "GET /api/reports/committed?from=2026-12&months=6&currency=ARS",
    );
  });

  it("shows an empty message when nothing is committed", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/committed?from=2026-12&months=6&currency=ARS": {
        body: {
          currency: "ARS",
          months: [{ month: "2026-12", installmentsMinor: 0, recurringMinor: 0, totalMinor: 0 }],
        },
      },
    });
    open();

    // Act
    await userEvent.click(await screen.findByRole("tab", { name: "Comprometido" }));

    // Assert
    expect(await screen.findByText("No hay nada comprometido en los próximos meses.")).toBeTruthy();
  });
});

describe("tabs", () => {
  it("move with the arrow keys and keep a single tab stop", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/monthly?to=2026-11&currency=ARS": {
        body: { currency: "ARS", months: [] },
      },
    });
    open();
    const first = await screen.findByRole("tab", { name: "En qué se va" });
    first.focus();

    // Act
    await userEvent.keyboard("{ArrowRight}");

    // Assert
    const second = screen.getByRole("tab", { name: "Mes a mes" });
    expect(second.getAttribute("aria-selected")).toBe("true");
    expect(first.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(second);
  });

  it("jump to the last and first tab with End and Home", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
      "GET /api/reports/committed?from=2026-12&months=6&currency=ARS": {
        body: { currency: "ARS", months: [] },
      },
    });
    open();
    const first = await screen.findByRole("tab", { name: "En qué se va" });
    first.focus();

    // Act
    await userEvent.keyboard("{End}");
    const last = screen.getByRole("tab", { name: "Comprometido" });
    const lastSelected = last.getAttribute("aria-selected");
    await userEvent.keyboard("{Home}");

    // Assert
    expect(lastSelected).toBe("true");
    expect(screen.getByRole("tab", { name: "En qué se va" }).getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("renders in English", async () => {
    // Arrange
    stubApi({
      ...base,
      "GET /api/reports/spending?month=2026-11&currency=ARS": { body: spending },
    });

    // Act
    open("en");

    // Assert
    expect(await screen.findByRole("tab", { name: "Where it goes" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: /Ungrouped/ })).toBeTruthy();
  });
});
