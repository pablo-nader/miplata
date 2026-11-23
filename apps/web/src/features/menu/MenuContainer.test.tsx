import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render";
import { MenuContainer } from "./MenuContainer";

const signOut = vi.fn(async (): Promise<{ error?: unknown } | undefined> => undefined);
const install = vi.hoisted(() => ({
  state: "browser" as "browser" | "ios" | "prompt" | "installed",
  install: null as (() => Promise<void>) | null,
}));

vi.mock("../auth/useSession", () => ({
  useSession: () => ({
    status: "signedIn",
    user: { id: "1", name: "Ana", email: "ana@example.com", image: null, locale: "es" },
    refresh: vi.fn(async () => {}),
  }),
}));
vi.mock("../auth/auth-client", () => ({ authClient: { signOut: () => signOut() } }));
vi.mock("../install/use-install", () => ({ useInstall: () => install }));
vi.mock("../recurring/recurring-api", () => ({
  fetchOccurrences: vi.fn(async () => ({ today: "2026-11-23", items: [] })),
  fetchRecurringList: vi.fn(async () => ({ items: [{ id: "r1" }, { id: "r2" }] })),
}));
vi.mock("../budgets/budgets-api", () => ({
  fetchBudgets: vi.fn(async () => ({ month: "2026-11", items: [{ id: "b1" }] })),
}));
vi.mock("../categories/useCategories", () => ({
  useCategories: () => ({
    state: {
      status: "ready",
      catalog: {
        expenseGroups: [{ id: "g1", categories: [{ id: "c1" }, { id: "c2" }] }],
        income: [{ id: "c3" }],
      },
    },
  }),
}));

function renderMenu(language: "es" | "en" = "es") {
  return renderApp(
    <Routes>
      <Route path="/" element={<p>root</p>} />
      <Route path="/menu" element={<MenuContainer />} />
    </Routes>,
    language,
    "/menu",
  );
}

describe("MenuContainer", () => {
  beforeEach(() => {
    signOut.mockClear();
    install.state = "browser";
    install.install = null;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the signed-in email", () => {
    // Arrange
    renderMenu("es");

    // Act
    const identity = screen.getByText("ana@example.com");

    // Assert
    expect(identity).toBeDefined();
  });

  it("lists the sections in order with their counters", async () => {
    // Arrange
    renderMenu("es");

    // Act
    const links = screen.getAllByRole("link").filter((link) => link.getAttribute("href") !== "/");

    // Assert
    await waitFor(() =>
      expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
        ["Por pagar0", "/to-pay"],
        ["Gastos fijos2", "/recurring"],
        ["Categorías3", "/categories"],
        ["Presupuestos1", "/budgets"],
        ["Préstamos", "/loans"],
        ["Ver guías", "/guides"],
        ["IdiomaEspañol", "/menu/language"],
      ]),
    );
  });

  it("shows the language row with the current language", () => {
    // Arrange
    renderMenu("en");

    // Act
    const row = screen.getByRole("link", { name: /Language/ });

    // Assert
    expect(row.getAttribute("href")).toBe("/menu/language");
    expect(row.textContent).toContain("English");
  });

  it("shows the iOS install steps on iPhone and iPad", () => {
    // Arrange
    install.state = "ios";
    renderMenu("es");

    // Act
    const text = screen.getByText("Tocá Compartir y después «Agregar a pantalla de inicio».");

    // Assert
    expect(text).toBeDefined();
  });

  it("offers the install action when the browser can prompt", async () => {
    // Arrange
    const prompt = vi.fn(async () => {});
    install.state = "prompt";
    install.install = prompt;
    renderMenu("es");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Instalar app" }));

    // Assert
    await waitFor(() => expect(prompt).toHaveBeenCalledOnce());
  });

  it("says the app is already installed", () => {
    // Arrange
    install.state = "installed";
    renderMenu("es");

    // Act
    const text = screen.getByText("La app ya está instalada.");

    // Assert
    expect(text).toBeDefined();
  });

  it("stays on the menu and warns when sign out fails", async () => {
    // Arrange
    signOut.mockResolvedValueOnce({ error: { status: 500 } });
    renderMenu("es");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain("cerrar la sesión");
    expect(screen.queryByText("root")).toBeNull();
  });

  it("signs out and goes back to the root", async () => {
    // Arrange
    renderMenu("es");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));

    // Assert
    await waitFor(() => expect(screen.getByText("root")).toBeDefined());
    expect(signOut).toHaveBeenCalledOnce();
  });
});
