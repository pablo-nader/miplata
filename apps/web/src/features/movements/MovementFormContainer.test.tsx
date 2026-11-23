import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../../app/i18n";
import { makeAccount, stubApi } from "../../test/fake-api";
import { lookupHandlers, makeMovement } from "../../test/fake-movements";
import { MovementFormContainer } from "./MovementFormContainer";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderForm(path: string) {
  return render(
    <I18nextProvider i18n={createI18n("es")}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/home" element={<p>home screen</p>} />
          <Route path="/movements" element={<p>movements list</p>} />
          <Route
            path="/accounts/:accountId/statement/charges/:movementId"
            element={<p>statement screen</p>}
          />
          <Route path="/movements/new" element={<MovementFormContainer />} />
          <Route path="/movements/:movementId/edit" element={<MovementFormContainer />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const created = { status: 201, body: makeMovement() };

async function openNew() {
  renderForm("/movements/new");
  return screen.findByRole("button", { name: "Guardar gasto" });
}

describe("recording an expense", () => {
  it("saves a cash expense in minor units and goes home", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/movements": created });
    await openNew();

    // Act
    await userEvent.type(screen.getByLabelText("Monto"), "48.300");
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.type(screen.getByLabelText("Descripción"), "Coto");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    expect(await screen.findByText("home screen")).toBeDefined();
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toEqual({
      type: "expense",
      occurredOn: "2026-11-25",
      description: "Coto",
      categoryId: "cat-groceries",
      accountId: "acc-cash",
      currency: "ARS",
      amountMinor: 4_830_000,
      installments: 1,
      person: null,
    });
  });

  it("records a dollar purchase using the account's dollar currency", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/movements": created });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "USD" }));
    await userEvent.type(screen.getByLabelText("Monto"), "120");
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    await screen.findByText("home screen");
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toMatchObject({
      currency: "USD",
      amountMinor: 12_000,
    });
  });

  it("offers installments for a card and shows each installment's amount", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/movements": created });
    await openNew();
    expect(screen.queryByLabelText("Cuotas")).toBeNull();

    // Act
    await userEvent.selectOptions(screen.getByLabelText("Cuenta"), "acc-visa");
    await userEvent.selectOptions(screen.getByLabelText("Cuotas"), "3");
    await userEvent.type(screen.getByLabelText("Monto"), "900.000");
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));

    // Assert
    expect(screen.getByText(/3 de \$\s300\.000/)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    await screen.findByText("home screen");
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toMatchObject({
      accountId: "acc-visa",
      installments: 3,
      amountMinor: 90_000_000,
    });
  });

  it("marks a purchase as belonging to another person", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/movements": created });
    await openNew();

    // Act
    await userEvent.type(screen.getByLabelText("Monto"), "120.000");
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.click(screen.getByRole("switch", { name: "Es de otra persona" }));
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "acc-juan");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    await screen.findByText("home screen");
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toMatchObject({
      person: { personId: "acc-juan", ownAmountMinor: 0 },
    });
  });

  it("sends the user's own share of a shared purchase and rejects a share equal to the total", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/movements": created });
    await openNew();
    await userEvent.type(screen.getByLabelText("Monto"), "80.000");
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.click(screen.getByRole("switch", { name: "Es de otra persona" }));
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "acc-juan");

    // Act
    await userEvent.type(screen.getByLabelText("Tu parte (opcional)"), "80.000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    const rejected = await screen.findByText("Tu parte tiene que ser menor que el total.");
    await userEvent.clear(screen.getByLabelText("Tu parte (opcional)"));
    await userEvent.type(screen.getByLabelText("Tu parte (opcional)"), "40.000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    expect(rejected).toBeDefined();
    await screen.findByText("home screen");
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toMatchObject({
      person: { personId: "acc-juan", ownAmountMinor: 4_000_000 },
    });
  });

  it("asks for the person when the switch is on and none is chosen", async () => {
    // Arrange
    stubApi({ ...lookupHandlers });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("switch", { name: "Es de otra persona" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    expect(await screen.findByText("Elegí una persona.")).toBeDefined();
  });

  it("explains what is missing instead of sending an incomplete form", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    expect(await screen.findByText("Ingresá un monto válido.")).toBeDefined();
    expect(screen.getByText("Elegí una categoría.")).toBeDefined();
    expect(calls.some((call) => call.key.startsWith("POST"))).toBe(false);
  });

  it("shows the reason when the server refuses and a generic message otherwise", async () => {
    // Arrange
    let attempt = 0;
    stubApi({
      ...lookupHandlers,
      "POST /api/movements": () => {
        attempt += 1;
        return attempt === 1
          ? { status: 400, body: { error: "invalid_request", reason: "amount_too_small" } }
          : { status: 500, body: {} };
      },
    });
    await openNew();
    await userEvent.type(screen.getByLabelText("Monto"), "1");
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));
    const first = await screen.findByText("El monto es muy chico para esa cantidad de cuotas.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    expect(first).toBeDefined();
    expect(
      await screen.findByText("No pudimos guardar el movimiento. Probá de nuevo."),
    ).toBeDefined();
  });
});

describe("recording an income", () => {
  it("offers income categories and saves an income", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/movements": created });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "Ingreso" }));
    await userEvent.type(screen.getByLabelText("Monto"), "1.250.000");
    await userEvent.click(await screen.findByRole("button", { name: "Sueldo" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar ingreso" }));

    // Assert
    await screen.findByText("home screen");
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toMatchObject({
      type: "income",
      categoryId: "cat-salary",
      amountMinor: 125_000_000,
    });
  });
});

describe("recording a transfer", () => {
  it("records a currency exchange with two amounts and shows the rate", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, "POST /api/movements": created });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "Transferencia" }));
    await userEvent.selectOptions(screen.getByLabelText("Cuenta de destino"), "acc-cash");
    const currencies = screen.getAllByRole("button", { name: "USD" });
    await userEvent.click(currencies[1] as HTMLElement);
    await userEvent.type(screen.getByLabelText("Monto que sale"), "1.230.000");
    await userEvent.type(screen.getByLabelText("Monto que entra"), "1.000");
    await userEvent.type(screen.getByLabelText("Descripción"), "Compra de dólares");

    // Assert
    expect(screen.getByRole("status").textContent).toContain("Cotización $ 1.230 por dólar");
    expect(screen.getByText(/No cuenta como gasto ni ingreso/)).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: "Guardar transferencia" }));
    await screen.findByText("home screen");
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toEqual({
      type: "transfer",
      occurredOn: "2026-11-25",
      description: "Compra de dólares",
      from: { accountId: "acc-cash", currency: "ARS", amountMinor: 123_000_000 },
      to: { accountId: "acc-cash", currency: "USD", amountMinor: 100_000 },
    });
  });

  it("asks for both accounts when they are missing", async () => {
    // Arrange
    stubApi({ ...lookupHandlers });
    await openNew();

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "Transferencia" }));
    await userEvent.selectOptions(screen.getByLabelText("Cuenta de origen"), "");
    await userEvent.click(screen.getByRole("button", { name: "Guardar transferencia" }));

    // Assert
    expect(await screen.findByText("Elegí la cuenta de origen.")).toBeDefined();
    expect(screen.getByText("Elegí la cuenta de destino.")).toBeDefined();
  });
});

describe("a movement that belongs to a statement", () => {
  const bound = makeMovement({
    statement: { id: "st-nov", accountId: "acc-visa", periodMonth: "2026-11" },
  });

  it("explains it and sends the user to the statement instead of showing the form", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, "GET /api/movements/mov-1": { body: bound } });
    renderForm("/movements/mov-1/edit");

    // Act
    const link = await screen.findByRole("button", { name: "Ir al resumen" });
    await userEvent.click(link);

    // Assert
    expect(await screen.findByText("statement screen")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).toBeNull();
  });

  it("maps the statement_movement refusal to a translated message", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      "GET /api/movements/mov-1": { body: makeMovement() },
      "PUT /api/movements/mov-1": { status: 409, body: { error: "statement_movement" } },
    });
    renderForm("/movements/mov-1/edit");
    await screen.findByLabelText("Monto");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    expect(
      await screen.findByText(
        "Este movimiento pertenece a un resumen de tarjeta. Editalo desde el resumen.",
      ),
    ).toBeDefined();
  });
});

describe("editing and deleting", () => {
  const existing = makeMovement({
    description: "Coto",
    account: { accountId: "acc-cash", currency: "ARS", amountMinor: 48_300_00 },
  });

  it("loads the movement, saves changes with PUT and goes back to the list", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      "GET /api/movements/mov-1": { body: existing },
      "PUT /api/movements/mov-1": { body: existing },
    });
    renderForm("/movements/mov-1/edit");
    const amount = await screen.findByLabelText("Monto");

    // Act
    await userEvent.clear(amount);
    await userEvent.type(amount, "50.000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    expect(await screen.findByText("movements list")).toBeDefined();
    expect(calls.find((call) => call.key === "PUT /api/movements/mov-1")?.body).toMatchObject({
      type: "expense",
      description: "Coto",
      amountMinor: 5_000_000,
    });
  });

  it("deletes only after confirming", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      "GET /api/movements/mov-1": { body: existing },
      "DELETE /api/movements/mov-1": { status: 204 },
    });
    renderForm("/movements/mov-1/edit");
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar movimiento" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    const afterCancel = calls.some((call) => call.key.startsWith("DELETE"));
    await userEvent.click(screen.getByRole("button", { name: "Eliminar movimiento" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(afterCancel).toBe(false);
    expect(await screen.findByText("movements list")).toBeDefined();
    expect(calls.some((call) => call.key === "DELETE /api/movements/mov-1")).toBe(true);
  });

  it("shows a message when the deletion fails", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      "GET /api/movements/mov-1": { body: existing },
      "DELETE /api/movements/mov-1": { status: 409, body: { error: "movement_in_use" } },
    });
    renderForm("/movements/mov-1/edit");
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar movimiento" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(
      await screen.findByText("No pudimos eliminar el movimiento. Probá de nuevo."),
    ).toBeDefined();
  });

  it("says so when the movement does not exist", async () => {
    // Arrange
    stubApi({ ...lookupHandlers });

    // Act
    renderForm("/movements/missing/edit");

    // Assert
    expect(await screen.findByText("No encontramos ese movimiento.")).toBeDefined();
  });

  it("offers a retry when the accounts cannot be loaded", async () => {
    // Arrange
    stubApi({});

    // Act
    renderForm("/movements/new");

    // Assert
    expect(await screen.findByRole("button", { name: "Reintentar" })).toBeDefined();
  });
});

describe("creating a person from the form", () => {
  const sofi = makeAccount({ id: "acc-sofi", type: "person", name: "Sofi" });

  async function startForOther() {
    await openNew();
    await userEvent.type(screen.getByLabelText("Monto"), "50.000");
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.click(screen.getByRole("switch", { name: "Es de otra persona" }));
  }

  it("creates the person with just a name, selects it and saves the expense for them", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      "POST /api/people": { status: 201, body: sofi },
      "POST /api/movements": created,
    });
    await startForOther();

    // Act
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");
    await userEvent.type(screen.getByLabelText("Nombre de la persona"), "  Sofi ");
    await userEvent.click(screen.getByRole("button", { name: "Crear persona" }));
    await screen.findByDisplayValue("Sofi");
    await userEvent.click(screen.getByRole("button", { name: "Guardar gasto" }));

    // Assert
    await screen.findByText("home screen");
    expect(calls.find((call) => call.key === "POST /api/people")?.body).toEqual({
      name: "Sofi",
      currencies: [
        { currency: "ARS", openingBalanceMinor: 0 },
        { currency: "USD", openingBalanceMinor: 0 },
      ],
    });
    expect(calls.find((call) => call.key === "POST /api/movements")?.body).toMatchObject({
      person: { personId: "acc-sofi", ownAmountMinor: 0 },
    });
  });

  it("creates the person with Enter without saving the movement", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      "POST /api/people": { status: 201, body: sofi },
    });
    await startForOther();

    // Act
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");
    await userEvent.type(screen.getByLabelText("Nombre de la persona"), "Sofi{Enter}");

    // Assert
    await screen.findByDisplayValue("Sofi");
    expect(screen.queryByLabelText("Nombre de la persona")).toBeNull();
    expect(calls.some((call) => call.key === "POST /api/movements")).toBe(false);
  });

  it("asks for a name and does not call the API with an empty one", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers });
    await startForOther();
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Crear persona" }));

    // Assert
    expect(await screen.findByText("Ingresá un nombre.")).toBeDefined();
    expect(calls.some((call) => call.key === "POST /api/people")).toBe(false);
  });

  it("keeps the typed name and explains when the person cannot be created", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, "POST /api/people": { status: 500, body: { error: "boom" } } });
    await startForOther();
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");

    // Act
    await userEvent.type(screen.getByLabelText("Nombre de la persona"), "Sofi");
    await userEvent.click(screen.getByRole("button", { name: "Crear persona" }));

    // Assert
    expect(await screen.findByText("No pudimos crear la persona. Probá de nuevo.")).toBeDefined();
    expect((screen.getByLabelText("Nombre de la persona") as HTMLInputElement).value).toBe("Sofi");
  });

  it("moves focus to the name field when the option is chosen", async () => {
    // Arrange
    stubApi({ ...lookupHandlers });
    await startForOther();

    // Act
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");

    // Assert
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByLabelText("Nombre de la persona")),
    );
  });

  it("drops the draft when the switch is turned off or an existing person is chosen", async () => {
    // Arrange
    stubApi({ ...lookupHandlers });
    await startForOther();
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");

    // Act
    await userEvent.click(screen.getByRole("switch", { name: "Es de otra persona" }));
    await userEvent.click(screen.getByRole("switch", { name: "Es de otra persona" }));
    const afterSwitch = screen.queryByLabelText("Nombre de la persona");
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "acc-juan");

    // Assert
    expect(afterSwitch).toBeNull();
    expect(screen.queryByLabelText("Nombre de la persona")).toBeNull();
  });

  it("closes the inline form on cancel", async () => {
    // Arrange
    stubApi({ ...lookupHandlers });
    await startForOther();
    await userEvent.selectOptions(screen.getByLabelText("Persona"), "+ Nueva persona");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(screen.queryByLabelText("Nombre de la persona")).toBeNull();
  });
});
