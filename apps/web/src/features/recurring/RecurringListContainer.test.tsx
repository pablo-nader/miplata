import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { lookupHandlers } from "../../test/fake-movements";
import { makeRecurring } from "../../test/fake-recurring";
import { renderApp } from "../../test/render";
import { RecurringListContainer } from "./RecurringListContainer";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 12));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const list = "GET /api/recurring";

const rent = makeRecurring();
const power = makeRecurring({
  id: "rec-power",
  description: "Luz",
  amountMode: "variable",
  amountMinor: null,
  frequency: "bimonthly",
  dayOfMonth: 20,
});
const gym = makeRecurring({ id: "rec-gym", description: "Gimnasio", isPaused: true });
const old = makeRecurring({ id: "rec-old", description: "Curso", endsOn: "2026-06-30" });

function text(element: HTMLElement) {
  return (element.textContent ?? "").replaceAll(" ", " ");
}

function renderList() {
  return renderApp(
    <Routes>
      <Route path="/recurring" element={<RecurringListContainer />} />
      <Route path="/recurring/new" element={<p>new form</p>} />
      <Route path="/recurring/:recurringId/edit" element={<p>edit form</p>} />
    </Routes>,
    "es",
    "/recurring",
  );
}

describe("RecurringListContainer", () => {
  it("lists each definition with its schedule, amount, account and status", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: { body: { items: [rent, power, gym, old] } } });

    // Act
    renderList();
    const alquiler = (await screen.findByText("Alquiler")).closest("li") as HTMLElement;
    const luz = screen.getByText("Luz").closest("li") as HTMLElement;

    // Assert
    expect(text(alquiler)).toContain("Mensual · día 5 · Efectivo");
    expect(text(alquiler)).toContain("$ 575.000");
    expect(text(alquiler)).toContain("Activo");
    expect(text(luz)).toContain("Cada dos meses · día 20");
    expect(text(luz)).toContain("variable");
    expect(text(screen.getByText("Gimnasio").closest("li") as HTMLElement)).toContain("Pausado");
    expect(text(screen.getByText("Curso").closest("li") as HTMLElement)).toContain("Terminado");
  });

  it("links to the form to add and to edit a definition", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: { body: { items: [rent] } } });
    renderList();

    // Act
    const add = await screen.findByRole("link", { name: "Agregar" });
    const row = screen.getByRole("link", { name: /Alquiler/ });

    // Assert
    expect(add.getAttribute("href")).toBe("/recurring/new");
    expect(row.getAttribute("href")).toBe("/recurring/rec-rent/edit");
  });

  it("pauses an active definition and resumes a paused one", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      [list]: { body: { items: [rent, gym] } },
      "POST /api/recurring/rec-rent/pause": { body: makeRecurring({ isPaused: true }) },
      "POST /api/recurring/rec-gym/resume": { body: makeRecurring({ id: "rec-gym" }) },
    });
    renderList();
    await screen.findByText("Alquiler");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Pausar Alquiler" }));
    await waitFor(() =>
      expect(calls.some((call) => call.key.endsWith("rec-rent/pause"))).toBe(true),
    );
    await userEvent.click(await screen.findByRole("button", { name: "Reanudar Gimnasio" }));

    // Assert
    await waitFor(() =>
      expect(calls.some((call) => call.key.endsWith("rec-gym/resume"))).toBe(true),
    );
    expect(calls.filter((call) => call.key === list).length).toBeGreaterThanOrEqual(3);
  });

  it("asks before ending a definition and ends it once confirmed", async () => {
    // Arrange
    const { calls } = stubApi({
      ...lookupHandlers,
      [list]: { body: { items: [rent] } },
      "POST /api/recurring/rec-rent/end": { body: makeRecurring({ endsOn: "2026-11-25" }) },
    });
    renderList();
    await screen.findByText("Alquiler");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Terminar Alquiler" }));
    const dialog = screen.getByRole("alertdialog");
    const beforeConfirm = calls.some((call) => call.key.endsWith("/end"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(beforeConfirm).toBe(false);
    expect(within(dialog).getByText("¿Terminar Alquiler?")).toBeDefined();
    await waitFor(() => expect(calls.some((call) => call.key.endsWith("rec-rent/end"))).toBe(true));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("closes the end confirmation without ending anything when cancelled", async () => {
    // Arrange
    const { calls } = stubApi({ ...lookupHandlers, [list]: { body: { items: [rent] } } });
    renderList();
    await screen.findByText("Alquiler");
    await userEvent.click(screen.getByRole("button", { name: "Terminar Alquiler" }));

    // Act
    await userEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancelar" }),
    );

    // Assert
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(calls.some((call) => call.key.endsWith("/end"))).toBe(false);
  });

  it("offers no actions for an ended definition", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: { body: { items: [old] } } });

    // Act
    renderList();
    await screen.findByText("Curso");

    // Assert
    expect(screen.queryByRole("button", { name: /Pausar|Terminar|Reanudar/ })).toBeNull();
  });

  it("shows why an action failed", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      [list]: { body: { items: [gym] } },
      "POST /api/recurring/rec-gym/resume": { status: 409, body: { error: "recurring_ended" } },
    });
    renderList();
    await userEvent.click(await screen.findByRole("button", { name: "Reanudar Gimnasio" }));

    // Act
    const alert = await screen.findByRole("alert");

    // Assert
    expect(alert.textContent).toBe("Este gasto fijo ya terminó.");
  });

  it("invites to add the first one when empty", async () => {
    // Arrange
    stubApi({ ...lookupHandlers, [list]: { body: { items: [] } } });

    // Act
    renderList();

    // Assert
    expect(await screen.findByText("Todavía no tenés gastos fijos")).toBeDefined();
    expect(screen.getAllByRole("link", { name: "Agregar" })).toHaveLength(2);
  });

  it("offers a retry when loading fails", async () => {
    // Arrange
    let healthy = false;
    stubApi({
      ...lookupHandlers,
      [list]: () => (healthy ? { body: { items: [rent] } } : { status: 500, body: { error: "x" } }),
    });
    renderList();
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    healthy = true;

    // Act
    await userEvent.click(retry);

    // Assert
    expect(await screen.findByText("Alquiler")).toBeDefined();
  });
});
