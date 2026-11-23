import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render";
import { MenuContainer } from "./MenuContainer";

const refresh = vi.fn(async () => {});
const signOut = vi.fn(async () => {});

vi.mock("../auth/useSession", () => ({
  useSession: () => ({
    status: "signedIn",
    user: { id: "1", name: "Ana", email: "ana@example.com", image: null, locale: "es" },
    refresh,
  }),
}));
vi.mock("../auth/auth-client", () => ({ authClient: { signOut: () => signOut() } }));

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
    refresh.mockClear();
    signOut.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the signed-in email and the current language", () => {
    // Arrange
    renderMenu("es");

    // Act
    const spanish = screen.getByRole("radio", { name: "Español" }) as HTMLInputElement;

    // Assert
    expect(screen.getByText("ana@example.com")).toBeDefined();
    expect(spanish.checked).toBe(true);
  });

  it("persists the chosen language through the api and translates the screen", async () => {
    // Arrange
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderMenu("es");

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "English" }));

    // Assert
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/locale",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ locale: "en" }) }),
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeDefined();
  });

  it("warns when the language could not be saved", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    renderMenu("es");

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "English" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain("could not save");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("warns when the request fails", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    renderMenu("es");

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "English" }));

    // Assert
    expect(await screen.findByRole("alert")).toBeDefined();
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
