import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { lookupHandlers } from "../../test/fake-movements";
import { makeRecurring } from "../../test/fake-recurring";
import { renderApp } from "../../test/render";
import { RecurringFormContainer } from "./RecurringFormContainer";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderForm(path: string) {
  return renderApp(
    <Routes>
      <Route path="/recurring" element={<p>recurring list</p>} />
      <Route path="/recurring/new" element={<RecurringFormContainer />} />
      <Route path="/recurring/:recurringId/edit" element={<RecurringFormContainer />} />
    </Routes>,
    "es",
    path,
  );
}

const created = { status: 201, body: makeRecurring() };

async function openNew() {
  renderForm("/recurring/new");
  return screen.findByRole("button", { name: "Guardar gasto fijo" });
}

function bodyOf(calls: { key: string; body: unknown }[], key: string) {
  return calls.find((call) => call.key === key)?.body;
}

describe("creating a recurring item", () => {
  it("saves a fixed monthly expense in minor units and goes back to the list", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/recurring": created });
    await openNew();

    // Act
    await userEvent.type(screen.getByLabelText("Monto"), "575.000");
    await userEvent.click(screen.getByRole("button", { name: "Mantenimiento" }));
    await userEvent.type(screen.getByLabelText("Descripción"), "Alquiler");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto fijo" }));

    // Assert
    expect(await screen.findByText("recurring list")).toBeDefined();
    expect(bodyOf(calls, "POST /api/recurring")).toEqual({
      type: "expense",
      frequency: "monthly",
      dayOfMonth: 25,
      amountMode: "fixed",
      amountMinor: 57_500_000,
      currency: "ARS",
      accountId: "acc-cash",
      categoryId: "cat-maintenance",
      description: "Alquiler",
      startsOn: "2026-11-25",
      endsOn: null,
    });
  });

  it("saves a variable yearly income on a chosen day with an end date", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/recurring": created });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "Ingreso" }));
    await userEvent.click(screen.getByRole("radio", { name: "Variable" }));
    await userEvent.click(screen.getByRole("button", { name: "Sueldo" }));
    await userEvent.selectOptions(screen.getByLabelText("Frecuencia"), "yearly");
    await userEvent.clear(screen.getByLabelText("Día del mes"));
    await userEvent.type(screen.getByLabelText("Día del mes"), "31");
    fireEvent.change(screen.getByLabelText("Termina (opcional)"), {
      target: { value: "2027-12-31" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto fijo" }));

    // Assert
    await screen.findByText("recurring list");
    expect(bodyOf(calls, "POST /api/recurring")).toMatchObject({
      type: "income",
      amountMode: "variable",
      amountMinor: null,
      frequency: "yearly",
      dayOfMonth: 31,
      categoryId: "cat-salary",
      endsOn: "2027-12-31",
    });
  });

  it("allows a credit card account and keeps the currency the account holds", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/recurring": created });
    await openNew();

    // Act
    await userEvent.selectOptions(screen.getByLabelText("Cuenta"), "acc-visa");
    await userEvent.type(screen.getByLabelText("Monto"), "180.000");
    await userEvent.click(screen.getByRole("button", { name: "Mantenimiento" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto fijo" }));

    // Assert
    await screen.findByText("recurring list");
    expect(bodyOf(calls, "POST /api/recurring")).toMatchObject({
      accountId: "acc-visa",
      currency: "ARS",
    });
  });

  it("shows the hint for short months", async () => {
    // Arrange
    stubApi(lookupHandlers);

    // Act
    await openNew();

    // Assert
    expect(screen.getByText("En los meses más cortos se usa el último día.")).toBeDefined();
  });

  it("marks the missing fields without sending anything", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/recurring": created });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto fijo" }));

    // Assert
    expect(screen.getByText("Ingresá un monto válido.")).toBeDefined();
    expect(screen.getByText("Elegí una categoría.")).toBeDefined();
    expect(calls.some((call) => call.key === "POST /api/recurring")).toBe(false);
    await userEvent.type(screen.getByLabelText("Monto"), "1");
    expect(screen.queryByText("Ingresá un monto válido.")).toBeNull();
  });

  it("explains a rejected save", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      "POST /api/recurring": {
        status: 400,
        body: { error: "invalid_request", reason: "category_type_mismatch" },
      },
    });
    await openNew();
    await userEvent.type(screen.getByLabelText("Monto"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Mantenimiento" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto fijo" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe(
      "La categoría no corresponde al tipo.",
    );
  });

  it("falls back to a generic message for unknown failures", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, "POST /api/recurring": { status: 500, body: { error: "boom" } } });
    await openNew();
    await userEvent.type(screen.getByLabelText("Monto"), "10");
    await userEvent.click(screen.getByRole("button", { name: "Mantenimiento" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto fijo" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos guardar el gasto fijo. Probá de nuevo.",
    );
  });
});

describe("editing a recurring item", () => {
  it("loads the definition and saves the changes with PUT", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      "GET /api/recurring/rec-rent": { body: makeRecurring() },
      "PUT /api/recurring/rec-rent": { body: makeRecurring() },
    });
    renderForm("/recurring/rec-rent/edit");
    const amount = (await screen.findByLabelText("Monto")) as HTMLInputElement;
    const loaded = amount.value;

    // Act
    await userEvent.clear(amount);
    await userEvent.type(amount, "600.000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    expect(loaded).toBe("575000");
    await screen.findByText("recurring list");
    expect(bodyOf(calls, "PUT /api/recurring/rec-rent")).toMatchObject({
      amountMinor: 60_000_000,
      description: "Alquiler",
      startsOn: "2026-01-05",
      dayOfMonth: 5,
    });
  });

  it("says when the definition does not exist", async () => {
    // Arrange
    stubApi(lookupHandlers);

    // Act
    renderForm("/recurring/missing/edit");

    // Assert
    expect(await screen.findByText("No encontramos este gasto fijo.")).toBeDefined();
  });
});
