import type { BudgetProgressDto } from "@miplata/shared";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { createFakeCategoriesBackend } from "../../test/fake-categories-backend";
import { renderApp } from "../../test/render";
import { BudgetFormContainer } from "./BudgetFormContainer";
import { BudgetsContainer } from "./BudgetsContainer";
import { currentMonth } from "./current-month";

afterEach(() => {
  vi.unstubAllGlobals();
});

const catalog = createFakeCategoriesBackend();
const categoriesBody = catalog.handle("GET", "/api/categories").body;
const food = catalog.groups[1];
const rent = catalog.categories.find((item) => item.nameKey === "defaults.category.rent");
const groceries = catalog.categories.find((item) => item.nameKey === "defaults.category.groceries");
const listKey = () => `GET /api/budgets?month=${currentMonth()}`;

function progress(changes: Partial<BudgetProgressDto>): BudgetProgressDto {
  return {
    id: "b1",
    categoryId: groceries?.id ?? null,
    groupId: null,
    currency: "ARS",
    limitMinor: 350000_00,
    month: currentMonth(),
    spentMinor: 0,
    remainingMinor: 350000_00,
    overspentMinor: 0,
    state: "below",
    ...changes,
  };
}

function stubBudgets(items: BudgetProgressDto[], extra: Parameters<typeof stubApi>[0] = {}) {
  return stubApi({
    "GET /api/categories": { body: categoriesBody },
    [listKey()]: { body: { month: currentMonth(), items } },
    ...extra,
  });
}

function renderScreens(path: string, language: "es" | "en" = "es") {
  return renderApp(
    <Routes>
      <Route path="/budgets" element={<BudgetsContainer />} />
      <Route path="/budgets/new" element={<BudgetFormContainer />} />
      <Route path="/budgets/:budgetId/edit" element={<BudgetFormContainer />} />
      <Route path="/menu" element={<p>menu</p>} />
    </Routes>,
    language,
    path,
  );
}

describe("BudgetsContainer", () => {
  let spent: BudgetProgressDto[];

  beforeEach(() => {
    spent = [
      progress({
        spentMinor: 290000_00,
        remainingMinor: 60000_00,
        state: "warning",
      }),
      progress({
        id: "b2",
        categoryId: null,
        groupId: food?.id ?? null,
        limitMinor: 100000_00,
        spentMinor: 100000_00,
        remainingMinor: 0,
        state: "reached",
      }),
      progress({
        id: "b3",
        categoryId: rent?.id ?? null,
        currency: "USD",
        limitMinor: 100_00,
        spentMinor: 150_00,
        remainingMinor: 0,
        overspentMinor: 50_00,
        state: "reached",
      }),
    ];
  });

  it("shows each budget with its amounts, calm note and progress bar", async () => {
    // Arrange
    stubBudgets(spent);

    // Act
    renderScreens("/budgets");
    const first = await screen.findByRole("link", { name: /Supermercado/ });
    const group = screen.getByRole("link", { name: /Comida/ });

    // Assert
    expect(within(first).getByText("$ 290.000 de $ 350.000")).toBeDefined();
    expect(within(first).getByText("Cerca del tope · te quedan $ 60.000")).toBeDefined();
    expect(
      within(first).getByRole("progressbar", { name: "Progreso de Supermercado" }),
    ).toBeDefined();
    expect(within(group).getByText("Llegaste al tope")).toBeDefined();
    expect(screen.getByText("Te pasaste por US$ 50")).toBeDefined();
    expect(screen.getByRole("link", { name: /Alquiler/ })).toBeDefined();
    expect(first.getAttribute("href")).toBe("/budgets/b1/edit");
    expect(screen.getByRole("link", { name: "Nuevo presupuesto" }).getAttribute("href")).toBe(
      "/budgets/new",
    );
  });

  it("is available in English", async () => {
    // Arrange
    stubBudgets(spent);

    // Act
    renderScreens("/budgets", "en");

    // Assert
    expect(await screen.findByText("Close to the limit · $ 60,000 left")).toBeDefined();
    expect(screen.getByText("Limit reached")).toBeDefined();
  });

  it("shows an empty state, an error and retries", async () => {
    // Arrange
    stubBudgets([]);

    // Act
    renderScreens("/budgets");

    // Assert
    expect(await screen.findByText("Todavía no hay presupuestos")).toBeDefined();
  });

  it("shows an error and loads again on retry", async () => {
    // Arrange
    stubApi({});
    renderScreens("/budgets");
    expect(await screen.findByText("No pudimos cargar los presupuestos.")).toBeDefined();
    stubBudgets(spent);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    // Assert
    expect(await screen.findByRole("link", { name: /Supermercado/ })).toBeDefined();
  });
});

describe("BudgetFormContainer", () => {
  it("creates a category budget and returns to the list", async () => {
    // Arrange
    const { calls } = stubBudgets([], {
      "POST /api/budgets": { status: 201, body: progress({}) },
    });
    renderScreens("/budgets/new");
    await userEvent.click(await screen.findByRole("button", { name: "Supermercado" }));

    // Act
    await userEvent.type(screen.getByLabelText("Tope mensual · ARS"), "350000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(calls.find((call) => call.key === "POST /api/budgets")?.body).toEqual({
      categoryId: groceries?.id,
      groupId: null,
      currency: "ARS",
      limitMinor: 350000_00,
    });
    expect(await screen.findByRole("link", { name: "Nuevo presupuesto" })).toBeDefined();
  });

  it("creates a group budget in dollars", async () => {
    // Arrange
    const { calls } = stubBudgets([], {
      "POST /api/budgets": {
        status: 201,
        body: progress({ categoryId: null, groupId: food?.id ?? null }),
      },
    });
    renderScreens("/budgets/new");
    await userEvent.click(await screen.findByRole("radio", { name: "Grupo" }));
    await userEvent.click(screen.getByRole("button", { name: "Comida" }));
    await userEvent.click(screen.getByRole("button", { name: "USD" }));

    // Act
    await userEvent.type(screen.getByLabelText("Tope mensual · USD"), "200");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(calls.find((call) => call.key === "POST /api/budgets")?.body).toEqual({
      categoryId: null,
      groupId: food?.id,
      currency: "USD",
      limitMinor: 200_00,
    });
  });

  it("asks for a target and a valid limit before sending", async () => {
    // Arrange
    const { calls } = stubBudgets([]);
    renderScreens("/budgets/new");

    // Act
    await userEvent.click(await screen.findByRole("button", { name: "Guardar" }));

    // Assert
    expect(screen.getByText("Elegí una categoría o un grupo.")).toBeDefined();
    expect(screen.getByText("Ingresá un monto mayor a cero.")).toBeDefined();
    expect(calls.some((call) => call.key.startsWith("POST"))).toBe(false);
  });

  it("explains a duplicate budget", async () => {
    // Arrange
    stubBudgets([], { "POST /api/budgets": { status: 409, body: { error: "budget_exists" } } });
    renderScreens("/budgets/new");
    await userEvent.click(await screen.findByRole("button", { name: "Supermercado" }));
    await userEvent.type(screen.getByLabelText("Tope mensual · ARS"), "10");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByText("Ya hay un presupuesto para eso en esa moneda.")).toBeDefined();
  });

  it("edits the limit of an existing budget", async () => {
    // Arrange
    const { calls } = stubBudgets([progress({ spentMinor: 10_00 })], {
      "PUT /api/budgets/b1": { body: progress({}) },
    });
    renderScreens("/budgets/b1/edit");
    const limit = await screen.findByLabelText("Tope mensual · ARS");
    expect((limit as HTMLInputElement).value).toBe("350.000");

    // Act
    await userEvent.clear(limit);
    await userEvent.type(limit, "400000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    expect(calls.find((call) => call.key === "PUT /api/budgets/b1")?.body).toMatchObject({
      limitMinor: 400000_00,
    });
  });

  it("deletes a budget after confirming", async () => {
    // Arrange
    const { calls } = stubBudgets([progress({})], { "DELETE /api/budgets/b1": { status: 204 } });
    renderScreens("/budgets/b1/edit");
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar presupuesto" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    // Assert
    expect(calls.some((call) => call.key === "DELETE /api/budgets/b1")).toBe(true);
    expect(await screen.findByRole("link", { name: "Nuevo presupuesto" })).toBeDefined();
  });

  it("keeps the budget when the confirmation is cancelled", async () => {
    // Arrange
    const { calls } = stubBudgets([progress({})]);
    renderScreens("/budgets/b1/edit");
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar presupuesto" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(calls.some((call) => call.key.startsWith("DELETE"))).toBe(false);
    expect(screen.getByRole("button", { name: "Eliminar presupuesto" })).toBeDefined();
  });

  it("says when the budget does not exist", async () => {
    // Arrange
    stubBudgets([]);

    // Act
    renderScreens("/budgets/missing/edit");

    // Assert
    expect(await screen.findByText("No encontramos ese presupuesto.")).toBeDefined();
  });
});
