import type { LoanDetail } from "@miplata/shared";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../../app/i18n";
import { stubApi } from "../../test/fake-api";
import { lookupHandlers, makeMovement } from "../../test/fake-movements";
import { LoanDetailContainer } from "./LoanDetailContainer";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderDetail(language: "es" | "en" = "es") {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <MemoryRouter initialEntries={["/loans/acc-juan"]}>
        <Routes>
          <Route path="/loans/:personId" element={<LoanDetailContainer />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const lend = makeMovement({
  id: "mov-lend",
  type: "transfer",
  description: "Préstamo a Juan",
  categoryId: null,
  account: null,
  from: { accountId: "acc-cash", currency: "ARS", amountMinor: 70_000_00 },
  to: { accountId: "acc-juan", currency: "ARS", amountMinor: 70_000_00 },
  installments: [],
});

const forgiven = makeMovement({
  id: "mov-forgiven",
  description: null,
  account: null,
  person: { personId: "acc-juan", ownAmountMinor: 500_00 },
  installments: [
    {
      number: 1,
      periodMonth: "2026-11",
      statementId: null,
      amountMinor: 500_00,
      ownAmountMinor: 500_00,
    },
  ],
});

const owesYou: LoanDetail = {
  personId: "acc-juan",
  name: "Juan",
  isActive: true,
  owesYou: [
    {
      currency: "ARS",
      amountMinor: 70_000_00,
      dueNowMinor: 20_000_00,
      pendingTotalMinor: 50_000_00,
    },
  ],
  youOwe: [{ currency: "USD", amountMinor: 30_00, dueNowMinor: 0, pendingTotalMinor: 0 }],
  movements: [lend, forgiven],
};

const settled: LoanDetail = { ...owesYou, owesYou: [], youOwe: [], movements: [lend] };

function stubDetail(...details: (LoanDetail | null)[]) {
  let index = 0;
  return stubApi({
    ...lookupHandlers,
    "GET /api/loans/acc-juan": () => {
      const current = details[Math.min(index, details.length - 1)];
      index += 1;
      return current ? { body: current } : { status: 404 };
    },
  });
}

describe("LoanDetailContainer", () => {
  it("shows the person, both balances, the pending installments and the history", async () => {
    // Arrange
    stubDetail(owesYou);

    // Act
    renderDetail();
    const owes = await screen.findByRole("region", { name: "Te debe" });
    const owed = screen.getByRole("region", { name: "Le debés" });
    const history = screen.getByRole("region", { name: "Movimientos" });

    // Assert
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Juan");
    expect(within(owes).getByText("+ $ 70.000")).toBeDefined();
    expect(within(owes).getByText("En este resumen: $ 20.000")).toBeDefined();
    expect(within(owes).getByText("Pendiente en total: $ 50.000")).toBeDefined();
    expect(within(owed).getByText("US$ 30")).toBeDefined();
    expect(within(history).getByText("Préstamo a Juan")).toBeDefined();
    expect(within(history).getByText("Deuda perdonada · Juan")).toBeDefined();
    expect(within(history).getByText("− $ 500")).toBeDefined();
  });

  it("links each balance to a repayment prefilled in the movement form", async () => {
    // Arrange
    stubDetail(owesYou);

    // Act
    renderDetail();
    const owes = await screen.findByRole("region", { name: "Te debe" });
    const owed = screen.getByRole("region", { name: "Le debés" });

    // Assert
    expect(
      within(owes).getByRole("link", { name: "Registrar devolución" }).getAttribute("href"),
    ).toBe("/movements/new?type=transfer&from=acc-juan&currency=ARS&amountMinor=7000000");
    expect(
      within(owed).getByRole("link", { name: "Registrar devolución" }).getAttribute("href"),
    ).toBe("/movements/new?type=transfer&to=acc-juan&currency=USD&amountMinor=3000");
  });

  it("forgives what the person owes as an expense and refreshes the balance", async () => {
    // Arrange
    let done = false;
    stubApi({
      ...lookupHandlers,
      "GET /api/loans/acc-juan": () => ({ body: done ? settled : owesYou }),
      "POST /api/loans/acc-juan/forgive": () => {
        done = true;
        return { status: 201, body: forgiven };
      },
    });
    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Perdonar deuda" }));
    const dialog = screen.getByRole("alertdialog", { name: "¿Perdonar la deuda de Juan?" });
    const confirm = within(dialog).getByRole("button", { name: "Confirmar" }) as HTMLButtonElement;
    const disabledBefore = confirm.disabled;

    // Act
    const bodyShown = within(dialog).getByText(/Juan te debe \$\s70\.000.*gasto de \$\s70\.000/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Supermercado" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(disabledBefore).toBe(true);
    expect(bodyShown).toBeDefined();
    expect(await screen.findByText("No hay deudas pendientes con esta persona.")).toBeDefined();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("sends the currency, the chosen category and today's date", async () => {
    // Arrange
    const handlers = {
      ...lookupHandlers,
      "GET /api/loans/acc-juan": { body: owesYou },
      "POST /api/loans/acc-juan/forgive": { status: 201, body: forgiven },
    };
    const { calls } = stubApi(handlers);
    renderDetail();
    const owes = await screen.findByRole("region", { name: "Te debe" });

    // Act
    await userEvent.click(within(owes).getByRole("button", { name: "Perdonar deuda" }));
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    await screen.findByRole("region", { name: "Te debe" });
    expect(calls.find((call) => call.key === "POST /api/loans/acc-juan/forgive")?.body).toEqual({
      currency: "ARS",
      categoryId: "cat-groceries",
      occurredOn: "2026-11-25",
    });
  });

  it("records the forgiveness of what the user owes as an income", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      "GET /api/loans/acc-juan": { body: owesYou },
      "POST /api/loans/acc-juan/forgive": { status: 201, body: forgiven },
    });
    renderDetail();
    const owed = await screen.findByRole("region", { name: "Le debés" });

    // Act
    await userEvent.click(within(owed).getByRole("button", { name: "Me perdonaron la deuda" }));
    const dialog = screen.getByRole("alertdialog", {
      name: "¿Registrar que Juan te perdonó la deuda?",
    });
    await userEvent.click(within(dialog).getByRole("button", { name: "Sueldo" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(within(dialog).getByText(/Le debés US\$ 30 a Juan/)).toBeDefined();
    await screen.findByRole("region", { name: "Le debés" });
    expect(calls.find((call) => call.key === "POST /api/loans/acc-juan/forgive")?.body).toEqual({
      currency: "USD",
      categoryId: "cat-salary",
      occurredOn: "2026-11-25",
    });
  });

  it("explains why the forgiveness failed and keeps the dialog open", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      "GET /api/loans/acc-juan": { body: owesYou },
      "POST /api/loans/acc-juan/forgive": { status: 400, body: { reason: "nothing_owed" } },
    });
    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Perdonar deuda" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe("Ya no hay deuda para perdonar.");
    expect(screen.getByRole("alertdialog")).toBeDefined();
  });

  it("uses a generic message for an unknown failure", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      "GET /api/loans/acc-juan": { body: owesYou },
      "POST /api/loans/acc-juan/forgive": { status: 500, body: { error: "boom" } },
    });
    renderDetail("en");
    await userEvent.click(await screen.findByRole("button", { name: "Forgive debt" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe(
      "We could not forgive the debt. Try again.",
    );
  });

  it("closes the dialog without calling the api when cancelling", async () => {
    // Arrange
    const { calls } = stubDetail(owesYou);
    renderDetail();
    await userEvent.click(await screen.findByRole("button", { name: "Perdonar deuda" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(calls.some((call) => call.key.startsWith("POST"))).toBe(false);
  });

  it("says there are no pending debts when the person is settled", async () => {
    // Arrange
    stubDetail(settled);

    // Act
    renderDetail();

    // Assert
    expect(await screen.findByText("No hay deudas pendientes con esta persona.")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Perdonar deuda" })).toBeNull();
  });

  it("shows a not-found message for an unknown person", async () => {
    // Arrange
    stubDetail(null);

    // Act
    renderDetail();

    // Assert
    expect(await screen.findByText("No encontramos a esta persona.")).toBeDefined();
  });

  it("shows an error and retries", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, "GET /api/loans/acc-juan": { status: 500 } });
    renderDetail("en");
    expect(await screen.findByText("We could not load the loans.")).toBeDefined();
    stubDetail(owesYou);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));

    // Assert
    expect(await screen.findByRole("region", { name: "Owes you" })).toBeDefined();
  });
});
