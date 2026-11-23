import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { createFakeCategoriesBackend } from "../../test/fake-categories-backend";
import { renderApp } from "../../test/render";
import { BudgetFormContainer } from "./BudgetFormContainer";
import { currentMonth } from "./current-month";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderForm(path: string) {
  return renderApp(
    <Routes>
      <Route path="/budgets" element={<p>budgets list</p>} />
      <Route path="/budgets/new" element={<BudgetFormContainer />} />
      <Route path="/budgets/:budgetId/edit" element={<BudgetFormContainer />} />
    </Routes>,
    "es",
    path,
  );
}

describe("when the browser is offline", () => {
  it("disables saving and explains why next to the button", async () => {
    // Arrange
    const categoriesBody = createFakeCategoriesBackend().handle("GET", "/api/categories").body;
    stubApi({
      "GET /api/categories": { body: categoriesBody },
      [`GET /api/budgets?month=${currentMonth()}`]: {
        body: { month: currentMonth(), items: [] },
      },
    });
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderForm("/budgets/new");

    // Act
    const save = await screen.findByRole("button", { name: "Guardar" });

    // Assert
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen
        .getByText("Estás sin conexión: guardar no está disponible hasta que vuelva la conexión.")
        .closest('[role="status"]'),
    ).not.toBeNull();
  });
});
