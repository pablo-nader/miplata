import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { lookupHandlers, makeMovement } from "../../test/fake-movements";
import {
  electricity,
  internet,
  occurrenceList,
  rent,
  salary,
  TODAY,
  unpriced,
} from "../../test/fake-recurring";
import { renderApp } from "../../test/render";
import { ToPayContainer } from "./ToPayContainer";

afterEach(() => {
  vi.unstubAllGlobals();
});

const list = "GET /api/recurring/occurrences";

function text(element: HTMLElement) {
  return (element.textContent ?? "").replaceAll(" ", " ");
}

describe("ToPayContainer", () => {
  it("groups overdue and due items, upcoming expenses and receivables", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: occurrenceList([rent, electricity, internet, salary]) });

    // Act
    renderApp(<ToPayContainer />, "es");
    const due = await screen.findByRole("region", { name: "Vencidos y hoy" });
    const upcoming = screen.getByRole("region", { name: "Próximos" });
    const receivable = screen.getByRole("region", { name: "Por cobrar" });

    // Assert
    const dueRows = within(due).getAllByRole("listitem");
    expect(text(dueRows[0] as HTMLElement)).toContain("Luz");
    expect(text(dueRows[0] as HTMLElement)).toContain("Venció 20/11 · Efectivo · variable");
    expect(text(dueRows[0] as HTMLElement)).toContain("$ 41.500");
    expect(text(dueRows[1] as HTMLElement)).toContain("Alquiler");
    expect(text(dueRows[1] as HTMLElement)).toContain("Hoy · Efectivo");
    expect(text(dueRows[1] as HTMLElement)).toContain("$ 575.000");
    expect(text(upcoming)).toContain("Internet");
    expect(text(upcoming)).toContain("10/12 · Efectivo");
    expect(text(receivable)).toContain("Sueldo");
    expect(text(receivable)).toContain("$ 1.250.000");
  });

  it("confirms a fixed item with one tap using its own amount on its due date", async () => {
    // Arrange
    let items = [rent, electricity];
    const { calls } = stubApi({
      ...lookupHandlers,
      [list]: () => occurrenceList(items),
      "POST /api/recurring/occurrences/occ-rent/confirm": () => {
        items = [electricity];
        return { status: 201, body: makeMovement() };
      },
    });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Alquiler");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Alquiler" }));

    // Assert
    await waitFor(() => expect(screen.queryByText("Alquiler")).toBeNull());
    const confirm = calls.find((call) => call.key.endsWith("occ-rent/confirm"));
    expect(confirm?.body).toEqual({ occurredOn: TODAY });
    expect(screen.getByText("Luz")).toBeDefined();
  });

  it("books an upcoming item today and labels an overdue one", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      [list]: occurrenceList([internet, unpriced]),
      "POST /api/recurring/occurrences/occ-internet/confirm": { status: 201, body: makeMovement() },
    });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Internet");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Internet" }));

    // Assert
    await waitFor(() =>
      expect(calls.find((call) => call.key.endsWith("occ-internet/confirm"))?.body).toEqual({
        occurredOn: TODAY,
      }),
    );
    expect(text(screen.getByText("Expensas").closest("li") as HTMLElement)).toContain(
      "Venció 24/11",
    );
  });

  it("adjusts a variable item with the suggested amount prefilled", async () => {
    // Arrange
    let items = [electricity];
    const { calls } = stubApi({
      ...lookupHandlers,
      [list]: () => occurrenceList(items),
      "POST /api/recurring/occurrences/occ-power/confirm": () => {
        items = [];
        return { status: 201, body: makeMovement() };
      },
    });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Luz");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Ajustar Luz" }));
    const panel = screen.getByRole("region", { name: "Ajustar Luz" });
    const amount = within(panel).getByLabelText("Monto") as HTMLInputElement;
    const prefilled = amount.value;
    await userEvent.clear(amount);
    await userEvent.type(amount, "43.200,50");
    await userEvent.selectOptions(within(panel).getByLabelText("Cuenta"), "acc-cash");
    await userEvent.click(within(panel).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(prefilled).toBe("41500");
    await waitFor(() => expect(screen.queryByText("Luz")).toBeNull());
    expect(calls.find((call) => call.key.endsWith("occ-power/confirm"))?.body).toEqual({
      amountMinor: 4_320_050,
      accountId: "acc-cash",
      occurredOn: "2026-11-20",
    });
    expect(screen.getByText("No tenés nada pendiente")).toBeDefined();
  });

  it("offers the adjust panel on a fixed item too and can cancel it", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: occurrenceList([rent]) });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Alquiler");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Ajustar Alquiler" }));
    const opened = screen.queryByRole("region", { name: "Ajustar Alquiler" });
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(opened).not.toBeNull();
    expect(screen.queryByRole("region", { name: "Ajustar Alquiler" })).toBeNull();
  });

  it("rejects an invalid amount or date without sending anything", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, [list]: occurrenceList([unpriced]) });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Expensas");
    await userEvent.click(screen.getByRole("button", { name: "Ajustar Expensas" }));
    const panel = screen.getByRole("region", { name: "Ajustar Expensas" });

    // Act
    await userEvent.clear(within(panel).getByLabelText("Fecha"));
    await userEvent.click(within(panel).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(within(panel).getByText("Ingresá un monto válido.")).toBeDefined();
    expect(within(panel).getByText("Ingresá una fecha válida.")).toBeDefined();
    expect(calls.some((call) => call.key.includes("/confirm"))).toBe(false);
    await userEvent.type(within(panel).getByLabelText("Monto"), "1");
    expect(within(panel).queryByText("Ingresá un monto válido.")).toBeNull();
  });

  it("skips an item from the fixed row and from the adjust panel", async () => {
    // Arrange
    let items = [rent, electricity];
    const { calls } = stubApi({
      ...lookupHandlers,
      [list]: () => occurrenceList(items),
      "POST /api/recurring/occurrences/occ-rent/skip": () => {
        items = [electricity];
        return { status: 204 };
      },
      "POST /api/recurring/occurrences/occ-power/skip": () => {
        items = [];
        return { status: 204 };
      },
    });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Alquiler");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Omitir Alquiler" }));
    await waitFor(() => expect(screen.queryByText("Alquiler")).toBeNull());
    await userEvent.click(screen.getByRole("button", { name: "Ajustar Luz" }));
    await userEvent.click(
      within(screen.getByRole("region", { name: "Ajustar Luz" })).getByRole("button", {
        name: "Omitir",
      }),
    );

    // Assert
    await waitFor(() => expect(screen.queryByText("Luz")).toBeNull());
    expect(calls.filter((call) => call.key.endsWith("/skip"))).toHaveLength(2);
  });

  it("explains a missing amount and keeps the panel open", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      [list]: occurrenceList([electricity]),
      "POST /api/recurring/occurrences/occ-power/confirm": {
        status: 400,
        body: { error: "amount_required" },
      },
    });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Luz");
    await userEvent.click(screen.getByRole("button", { name: "Ajustar Luz" }));

    // Act
    await userEvent.click(
      within(screen.getByRole("region", { name: "Ajustar Luz" })).getByRole("button", {
        name: "Confirmar",
      }),
    );

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe("Ingresá el monto de este pago.");
    expect(screen.getByRole("region", { name: "Ajustar Luz" })).toBeDefined();
  });

  it("reloads and reports an item that was already resolved", async () => {
    // Arrange
    let items = [rent];
    stubApi({
      ...lookupHandlers,
      [list]: () => occurrenceList(items),
      "POST /api/recurring/occurrences/occ-rent/confirm": () => {
        items = [];
        return { status: 409, body: { error: "occurrence_resolved" } };
      },
    });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Alquiler");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Alquiler" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe("Este pago ya estaba resuelto.");
    await waitFor(() => expect(screen.queryByText("Alquiler")).toBeNull());
  });

  it("shows a generic message for unknown failures and a network message offline", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      [list]: occurrenceList([rent]),
      "POST /api/recurring/occurrences/occ-rent/confirm": { status: 500, body: { error: "boom" } },
    });
    renderApp(<ToPayContainer />, "es");
    await screen.findByText("Alquiler");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Alquiler" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toBe(
      "No pudimos completar la acción. Probá de nuevo.",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Confirmar Alquiler" }));
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toBe("No pudimos conectarnos. Probá de nuevo."),
    );
  });

  it("shows an item without an amount with a placeholder", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: occurrenceList([unpriced]) });

    // Act
    renderApp(<ToPayContainer />, "es");
    const row = (await screen.findByText("Expensas")).closest("li") as HTMLElement;

    // Assert
    expect(text(row)).toContain("—");
    expect(text(row)).not.toContain("$");
  });

  it("falls back to the category name when there is no description", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      [list]: occurrenceList([{ ...rent, description: null }]),
    });

    // Act
    renderApp(<ToPayContainer />, "es");

    // Assert
    expect(await screen.findByRole("button", { name: "Confirmar Mantenimiento" })).toBeDefined();
  });

  it("shows an empty state when nothing is pending", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: occurrenceList([]) });

    // Act
    renderApp(<ToPayContainer />, "es");

    // Assert
    expect(await screen.findByText("No tenés nada pendiente")).toBeDefined();
  });

  it("offers a retry when the list cannot be loaded", async () => {
    // Arrange
    let healthy = false;
    stubApi({
      ...lookupHandlers,
      [list]: () => (healthy ? occurrenceList([rent]) : { status: 500, body: { error: "boom" } }),
    });
    renderApp(<ToPayContainer />, "es");
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    healthy = true;

    // Act
    await userEvent.click(retry);

    // Assert
    expect(await screen.findByText("Alquiler")).toBeDefined();
  });

  it("translates the screen to English", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: occurrenceList([rent, salary]) });

    // Act
    renderApp(<ToPayContainer />, "en");

    // Assert
    expect(await screen.findByRole("region", { name: "Overdue and today" })).toBeDefined();
    expect(screen.getByRole("region", { name: "To collect" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Confirm Alquiler" })).toBeDefined();
  });
});
