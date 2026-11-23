import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionState } from "../features/auth/useSession";
import { renderApp } from "../test/render";
import { AppRoutes } from "./AppRoutes";
import { resources } from "./i18n";

let state: SessionState;

vi.mock("../features/auth/useSession", () => ({ useSession: () => state }));

const refresh = async () => {};
const signedIn: SessionState = {
  status: "signedIn",
  user: { id: "1", name: "Ana", email: "ana@example.com", image: null, locale: "es" },
  refresh,
};

const routes = [
  ["/balance", "balance"],
  ["/movements", "movements"],
  ["/movements/new", "newMovement"],
  ["/accounts", "accounts"],
  ["/accounts/7/statement", "statement"],
  ["/accounts/7/statement/pay", "payStatement"],
  ["/to-pay", "toPay"],
  ["/reports", "reports"],
  ["/menu", "menu"],
] as const;

describe("AppRoutes", () => {
  beforeEach(() => {
    state = signedIn;
  });

  it.each(routes)("renders %s in Spanish", (path, key) => {
    // Arrange
    renderApp(<AppRoutes />, "es", path);

    // Act
    const heading = screen.getByRole("heading", { level: 1 });

    // Assert
    expect(heading.textContent).toBe(resources.es.translation.screens[key].title);
  });

  it.each(routes)("renders %s in English", (path, key) => {
    // Arrange
    renderApp(<AppRoutes />, "en", path);

    // Act
    const heading = screen.getByRole("heading", { level: 1 });

    // Assert
    expect(heading.textContent).toBe(resources.en.translation.screens[key].title);
  });

  it("renders the home band with the menu entry", () => {
    // Arrange
    renderApp(<AppRoutes />, "es", "/home");

    // Act
    const menu = screen.getByRole("link", { name: "Menú" });

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "miPlata" })).toBeDefined();
    expect(menu.getAttribute("href")).toBe("/menu");
  });

  it("redirects unknown paths to home", () => {
    // Arrange
    renderApp(<AppRoutes />, "en", "/nowhere");

    // Act
    const heading = screen.getByRole("heading", { level: 1 });

    // Assert
    expect(heading.textContent).toBe("miPlata");
  });

  it.each(routes)("renders a main landmark on %s", (path) => {
    // Arrange
    renderApp(<AppRoutes />, "es", path);

    // Act
    const landmarks = screen.getAllByRole("main");

    // Assert
    expect(landmarks).toHaveLength(1);
  });

  it("offers a way back home on focused screens only", () => {
    // Arrange
    renderApp(<AppRoutes />, "en", "/balance");

    // Act
    const back = screen.getByRole("link", { name: "Back to home" });

    // Assert
    expect(back.getAttribute("href")).toBe("/home");
  });

  it("shows navigation only on the main sections", () => {
    // Arrange
    renderApp(<AppRoutes />, "en", "/movements/new");

    // Act
    const navigation = screen.queryAllByRole("navigation");

    // Assert
    expect(navigation).toHaveLength(0);
  });

  it("offers both navigations on a main section with the current one marked", () => {
    // Arrange
    renderApp(<AppRoutes />, "es", "/reports");

    // Act
    const navigations = screen.getAllByRole("navigation", { name: "Navegación principal" });
    const current = screen.getAllByRole("link", { current: "page" });

    // Assert
    expect(navigations).toHaveLength(2);
    expect(current.map((link) => link.textContent)).toEqual(["Reportes", "Reportes"]);
  });

  it("navigates with the tab bar", async () => {
    // Arrange
    renderApp(<AppRoutes />, "en", "/home");

    // Act
    await userEvent.click(screen.getAllByRole("link", { name: "Accounts" })[0] as HTMLElement);

    // Assert
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Accounts");
  });
});

describe("AppRoutes when signed out", () => {
  beforeEach(() => {
    state = { status: "signedOut", user: null, refresh };
  });

  it.each(routes)("sends %s to the public landing page", (path) => {
    // Arrange
    renderApp(<AppRoutes />, "es", path);

    // Act
    const heading = screen.getByRole("heading", { level: 1 });

    // Assert
    expect(heading.textContent).toBe("miPlata");
    expect(screen.getByRole("button", { name: "Entrar con Google" })).toBeDefined();
    expect(screen.queryAllByRole("navigation", { name: "Navegación principal" })).toHaveLength(0);
  });

  it("keeps the legal pages public", () => {
    // Arrange
    renderApp(<AppRoutes />, "en", "/privacy");

    // Act
    const heading = screen.getByRole("heading", { level: 1 });

    // Assert
    expect(heading.textContent).toBe(resources.en.translation.legal.privacy.title);
  });
});

describe("AppRoutes for a signed-in visitor on the landing page", () => {
  it("sends them to the home screen", () => {
    // Arrange
    state = signedIn;

    // Act
    renderApp(<AppRoutes />, "es", "/");

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "miPlata" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Menú" }).getAttribute("href")).toBe("/menu");
  });

  it("sends the unknown paths on to the home screen", () => {
    // Arrange
    state = signedIn;

    // Act
    renderApp(<AppRoutes />, "es", "/nowhere");

    // Assert
    expect(screen.getByRole("link", { name: "Menú" })).toBeDefined();
  });
});

describe("AppRoutes while the session loads", () => {
  it("renders nothing yet", () => {
    // Arrange
    state = { status: "loading", user: null, refresh };

    // Act
    renderApp(<AppRoutes />, "es", "/movements");

    // Assert
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
