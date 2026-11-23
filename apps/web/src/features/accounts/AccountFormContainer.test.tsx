import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../../app/i18n";
import { galicia, makeAccount, mercadoPago, stubApi } from "../../test/fake-api";
import { AccountFormContainer } from "./AccountFormContainer";

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderForm(path: string) {
  return render(
    <I18nextProvider i18n={createI18n("es")}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/accounts" element={<p>accounts list</p>} />
          <Route path="/accounts/new" element={<AccountFormContainer />} />
          <Route path="/accounts/:accountId/edit" element={<AccountFormContainer />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const catalog = { "GET /api/institutions": { body: [galicia, mercadoPago] } };

function listOf(accounts: unknown[], people: unknown[] = []) {
  return {
    ...catalog,
    "GET /api/accounts": { body: accounts },
    "GET /api/people": { body: people },
  };
}

async function openNewForm() {
  renderForm("/accounts/new");
  return screen.findByRole("button", { name: "Guardar cuenta" });
}

describe("creating an account", () => {
  it("creates a bank account from the catalog and goes back to the list", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([]),
      "POST /api/accounts": { status: 201, body: makeAccount() },
    });
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Galicia" }));
    await userEvent.type(screen.getByLabelText("Saldo inicial · ARS"), "1.250,50");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    expect(await screen.findByText("accounts list")).toBeDefined();
    const post = calls.find((call) => call.key === "POST /api/accounts");
    expect(post?.body).toEqual({
      type: "bank",
      name: "Galicia",
      institutionId: galicia.id,
      currencies: [{ currency: "ARS", openingBalanceMinor: 125_050 }],
    });
  });

  it("only offers banks for the bank type and wallets for the wallet type", async () => {
    // Arrange
    stubApi(listOf([]));
    await openNewForm();

    // Act
    const bankOptions = screen.getAllByRole("button", { pressed: false }).map((b) => b.textContent);
    await userEvent.click(screen.getByRole("button", { name: "Billetera" }));

    // Assert
    expect(bankOptions).toContain("Galicia");
    expect(bankOptions).not.toContain("Mercado Pago");
    expect(screen.getByRole("button", { name: "Mercado Pago" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "Galicia" })).toBeNull();
  });

  it("creates a custom named cash account with both currencies", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([]),
      "POST /api/accounts": { status: 201, body: makeAccount() },
    });
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Efectivo" }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Caja");
    await userEvent.click(screen.getByRole("switch", { name: "Dólares" }));
    await userEvent.type(screen.getByLabelText("Saldo inicial · USD"), "450");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    await screen.findByText("accounts list");
    expect(calls.find((call) => call.key === "POST /api/accounts")?.body).toEqual({
      type: "cash",
      name: "Caja",
      currencies: [
        { currency: "ARS", openingBalanceMinor: 0 },
        { currency: "USD", openingBalanceMinor: 45_000 },
      ],
    });
  });

  it("creates a credit card with its closing and due days", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([]),
      "POST /api/accounts": { status: 201, body: makeAccount() },
    });
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Tarjeta" }));
    await userEvent.click(screen.getByRole("button", { name: "Otro" }));
    await userEvent.type(screen.getByLabelText("Nombre"), "Visa");
    await userEvent.type(screen.getByLabelText("Día de cierre"), "27");
    await userEvent.type(screen.getByLabelText("Día de vencimiento"), "5");
    await userEvent.type(screen.getByLabelText("Deuda actual · ARS"), "1000");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    await screen.findByText("accounts list");
    expect(calls.find((call) => call.key === "POST /api/accounts")?.body).toEqual({
      type: "credit_card",
      name: "Visa",
      closingDay: 27,
      dueDay: 5,
      currencies: [{ currency: "ARS", openingBalanceMinor: -100_000 }],
    });
  });

  it("creates a person through the people endpoint", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([]),
      "POST /api/people": { status: 201, body: makeAccount({ type: "person" }) },
    });
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Persona" }));
    const hint = screen.queryByText("Positivo: te debe. Negativo: le debés.");
    await userEvent.type(screen.getByLabelText("Nombre"), "Juan");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    await screen.findByText("accounts list");
    expect(calls.some((call) => call.key === "POST /api/people")).toBe(true);
    expect(hint).not.toBeNull();
  });

  it("shows validation errors and does not call the API", async () => {
    // Arrange
    const { calls } = stubApi(listOf([]));
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Efectivo" }));
    await userEvent.click(screen.getByRole("switch", { name: "Pesos" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    expect(await screen.findByText("Poné un nombre o elegí una institución.")).toBeDefined();
    expect(screen.getByText("Elegí al menos una moneda.")).toBeDefined();
    expect(calls.some((call) => call.key.startsWith("POST"))).toBe(false);
  });

  it("flags an invalid amount", async () => {
    // Arrange
    stubApi(listOf([]));
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Galicia" }));
    await userEvent.type(screen.getByLabelText("Saldo inicial · ARS"), "-");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    expect(await screen.findByText("Ingresá un monto válido.")).toBeDefined();
  });

  it("shows a message when the server rejects the account", async () => {
    // Arrange
    stubApi({
      ...listOf([]),
      "POST /api/accounts": { status: 400, body: { error: "invalid_request" } },
    });
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Galicia" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    expect(await screen.findByText("No pudimos guardar la cuenta. Probá de nuevo.")).toBeDefined();
  });

  it("shows an error when the form data cannot be loaded and retries", async () => {
    // Arrange
    stubApi({});
    renderForm("/accounts/new");
    expect(await screen.findByText("No pudimos cargar tus cuentas.")).toBeDefined();
    stubApi(listOf([]));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    // Assert
    expect(await screen.findByRole("button", { name: "Guardar cuenta" })).toBeDefined();
  });

  it("follows the institution name until the user types a custom one", async () => {
    // Arrange
    stubApi(listOf([]));
    await openNewForm();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Galicia" }));
    const name = screen.getByLabelText("Nombre (opcional)") as HTMLInputElement;
    const followed = name.value;
    await userEvent.click(screen.getByRole("button", { name: "Otro" }));

    // Assert
    expect(followed).toBe("Galicia");
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("");
  });
});

describe("when the browser is offline", () => {
  it("disables saving and explains why next to the button", async () => {
    // Arrange
    stubApi(listOf([]));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    // Act
    const save = await openNewForm();

    // Assert
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen
        .getByText("Estás sin conexión: guardar no está disponible hasta que vuelva la conexión.")
        .closest('[role="status"]'),
    ).not.toBeNull();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
});

describe("editing an account", () => {
  const bank = makeAccount({
    id: "bank-1",
    type: "bank",
    name: "Galicia",
    institution: galicia,
    currencies: [{ currency: "ARS", openingBalanceMinor: 100_000, balanceMinor: 150_000 }],
  });

  it("loads the account, saves the changes and goes back", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([bank]),
      "PATCH /api/accounts/bank-1": { body: bank },
    });
    renderForm("/accounts/bank-1/edit");
    const name = (await screen.findByLabelText("Nombre (opcional)")) as HTMLInputElement;

    // Act
    await userEvent.clear(name);
    await userEvent.type(name, "Galicia sueldo");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    await screen.findByText("accounts list");
    expect(calls.find((call) => call.key === "PATCH /api/accounts/bank-1")?.body).toEqual({
      name: "Galicia sueldo",
      currencies: [{ currency: "ARS", openingBalanceMinor: 100_000 }],
      institutionId: galicia.id,
    });
    expect(screen.queryByRole("button", { name: "Efectivo" })).toBeNull();
  });

  it("explains that a currency with movements cannot be removed", async () => {
    // Arrange
    stubApi({
      ...listOf([bank]),
      "PATCH /api/accounts/bank-1": { status: 409, body: { error: "currency_in_use" } },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    expect(
      await screen.findByText("No podés sacar una moneda que ya tiene movimientos."),
    ).toBeDefined();
  });

  it("asks for confirmation before deleting and then deletes", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([bank]),
      "DELETE /api/accounts/bank-1": { status: 204 },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar Galicia?" });
    expect(
      within(dialog).getByText("Se elimina para siempre. No se puede deshacer."),
    ).toBeDefined();
    expect(calls.some((call) => call.key.startsWith("DELETE"))).toBe(false);
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(await screen.findByText("accounts list")).toBeDefined();
    expect(calls.some((call) => call.key === "DELETE /api/accounts/bank-1")).toBe(true);
  });

  it("lets the user cancel the confirmation", async () => {
    // Arrange
    const { calls } = stubApi(listOf([bank]));
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeDefined();
    expect(calls.some((call) => call.key.startsWith("DELETE"))).toBe(false);
  });

  it("only offers deactivation when the account has movements", async () => {
    // Arrange
    const used = { ...bank, canDelete: false };
    const { calls } = stubApi({
      ...listOf([used]),
      "POST /api/accounts/bank-1/deactivate": { body: { ...used, isActive: false } },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");

    // Act
    const hint = screen.getByText(
      "Esta cuenta tiene movimientos, así que solo se puede desactivar.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));
    const dialog = screen.getByRole("alertdialog", { name: "¿Desactivar Galicia?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(hint).toBeDefined();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
    expect(await screen.findByText("accounts list")).toBeDefined();
    expect(calls.some((call) => call.key === "POST /api/accounts/bank-1/deactivate")).toBe(true);
  });

  it("shows why the deletion failed when the server says the account is in use", async () => {
    // Arrange
    stubApi({
      ...listOf([bank]),
      "DELETE /api/accounts/bank-1": { status: 409, body: { error: "account_in_use" } },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(
      await screen.findByText(
        "Esta cuenta ya tiene movimientos: no se puede eliminar, solo desactivar.",
      ),
    ).toBeDefined();
  });

  it("shows a generic message when the action fails", async () => {
    // Arrange
    stubApi({
      ...listOf([bank]),
      "POST /api/accounts/bank-1/deactivate": { status: 500, body: { error: "boom" } },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");
    await userEvent.click(screen.getByRole("button", { name: "Desactivar" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(
      await screen.findByText("No pudimos completar la acción. Probá de nuevo."),
    ).toBeDefined();
  });

  it("reactivates an inactive account without confirmation", async () => {
    // Arrange
    const inactive = { ...bank, isActive: false };
    const { calls } = stubApi({
      ...listOf([inactive]),
      "POST /api/accounts/bank-1/reactivate": { body: bank },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Reactivar" }));

    // Assert
    expect(await screen.findByText("accounts list")).toBeDefined();
    expect(calls.some((call) => call.key === "POST /api/accounts/bank-1/reactivate")).toBe(true);
  });

  it("shows a failure when reactivating does not work", async () => {
    // Arrange
    stubApi({ ...listOf([{ ...bank, isActive: false }]) });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Reactivar" }));

    // Assert
    expect(
      await screen.findByText("No pudimos completar la acción. Probá de nuevo."),
    ).toBeDefined();
  });

  it("edits a person through the people endpoints", async () => {
    // Arrange
    const person = makeAccount({ id: "p-1", type: "person", name: "Juan" });
    const { calls } = stubApi({
      ...listOf([], [person]),
      "PATCH /api/people/p-1": { body: person },
      "DELETE /api/people/p-1": { status: 204 },
    });
    renderForm("/accounts/p-1/edit");
    const name = (await screen.findByLabelText("Nombre")) as HTMLInputElement;

    // Act
    await userEvent.type(name, " P.");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    await screen.findByText("accounts list");
    expect(calls.find((call) => call.key === "PATCH /api/people/p-1")?.body).toMatchObject({
      name: "Juan P.",
    });
  });

  it("shows a message when the account does not exist", async () => {
    // Arrange
    stubApi(listOf([bank]));

    // Act
    renderForm("/accounts/missing/edit");

    // Assert
    expect(await screen.findByText("No encontramos esa cuenta.")).toBeDefined();
  });

  it("translates the default cash name and keeps it unless renamed", async () => {
    // Arrange
    const cash = makeAccount({ id: "cash-1", name: null, nameKey: "defaults.account.cash" });
    const { calls } = stubApi({ ...listOf([cash]), "PATCH /api/accounts/cash-1": { body: cash } });
    renderForm("/accounts/cash-1/edit");
    const name = (await screen.findByLabelText("Nombre")) as HTMLInputElement;

    // Act
    const shown = name.value;
    await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    await screen.findByText("accounts list");
    expect(shown).toBe("Efectivo");
    expect(
      calls.find((call) => call.key === "PATCH /api/accounts/cash-1")?.body,
    ).not.toHaveProperty("name");
  });
});

describe("confirmation dialog accessibility", () => {
  const bank = makeAccount({ id: "bank-1", type: "bank", name: "Galicia", institution: galicia });

  it("moves focus into the dialog and closes it with Escape", async () => {
    // Arrange
    stubApi(listOf([bank]));
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = screen.getByRole("alertdialog");
    const focused = document.activeElement === dialog;
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(focused).toBe(true);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("sends the deletion once even when confirmed twice", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([bank]),
      "DELETE /api/accounts/bank-1": { status: 204 },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    const confirm = screen.getByRole("button", { name: "Confirmar" });

    // Act
    await userEvent.dblClick(confirm);

    // Assert
    await screen.findByText("accounts list");
    expect(calls.filter((call) => call.key.startsWith("DELETE"))).toHaveLength(1);
  });

  it("returns focus to the actions area when the panel is cancelled", async () => {
    // Arrange
    stubApi(listOf([bank]));
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(document.activeElement?.className).toBe("account-form__manage");
  });

  it("announces a failed action as an alert", async () => {
    // Arrange
    stubApi({
      ...listOf([bank]),
      "DELETE /api/accounts/bank-1": { status: 409, body: { error: "account_in_use" } },
    });
    renderForm("/accounts/bank-1/edit");
    await screen.findByLabelText("Nombre (opcional)");
    await userEvent.click(screen.getByRole("button", { name: "Eliminar" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("no se puede eliminar");
  });
});

describe("opening the form for a person", () => {
  it("starts as a person when the link asks for it", async () => {
    // Arrange
    const { calls } = stubApi({
      ...listOf([]),
      "POST /api/people": { status: 201, body: makeAccount({ type: "person" }) },
    });

    // Act
    renderForm("/accounts/new?type=person");
    await screen.findByRole("button", { name: "Guardar cuenta" });
    const selected = screen.getByRole("button", { name: "Persona" }).getAttribute("aria-pressed");
    await userEvent.type(screen.getByLabelText("Nombre"), "Juan");
    await userEvent.click(screen.getByRole("button", { name: "Guardar cuenta" }));

    // Assert
    expect(selected).toBe("true");
    await screen.findByText("accounts list");
    expect(calls.some((call) => call.key === "POST /api/people")).toBe(true);
  });

  it("starts as a bank account without the parameter", async () => {
    // Arrange
    stubApi({ ...listOf([]) });

    // Act
    await openNewForm();

    // Assert
    expect(screen.getByRole("button", { name: "Persona" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });
});
