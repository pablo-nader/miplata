import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderApp } from "../../test/render";
import { LanguageContainer } from "./LanguageContainer";

const refresh = vi.fn(async () => {});

vi.mock("../auth/useSession", () => ({
  useSession: () => ({
    status: "signedIn",
    user: { id: "1", name: "Ana", email: "ana@example.com", image: null, locale: "es" },
    refresh,
  }),
}));

function renderLanguage(language: "es" | "en" = "es") {
  return renderApp(
    <Routes>
      <Route path="/menu" element={<p>menu</p>} />
      <Route path="/menu/language" element={<LanguageContainer />} />
    </Routes>,
    language,
    "/menu/language",
  );
}

describe("LanguageContainer", () => {
  beforeEach(() => {
    refresh.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks the current language", () => {
    // Arrange
    renderLanguage("es");

    // Act
    const current = screen.getByRole("button", { name: "Español" });

    // Assert
    expect(current.getAttribute("aria-current")).toBe("true");
    expect(screen.getByRole("button", { name: "English" }).getAttribute("aria-current")).toBeNull();
  });

  it("persists the chosen language through the api", async () => {
    // Arrange
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    renderLanguage("es");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "English" }));

    // Assert
    await waitFor(() => expect(refresh).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/me/locale",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ locale: "en" }) }),
    );
  });

  it("warns when the language could not be saved", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    renderLanguage("es");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "English" }));

    // Assert
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("button", { name: "Español" }).getAttribute("aria-current")).toBe(
      "true",
    );
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
    renderLanguage("es");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "English" }));

    // Assert
    expect(await screen.findByRole("alert")).toBeDefined();
  });

  it("waits for the first save before sending the next language", async () => {
    // Arrange
    const sent: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        sent.push(JSON.parse(init.body).locale);
        if (sent.length === 1) await gate;
        return new Response("{}", { status: 200 });
      }),
    );
    renderLanguage("es");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "English" }));
    await userEvent.click(screen.getByRole("button", { name: "Español" }));
    const beforeRelease = [...sent];
    release();

    // Assert
    expect(beforeRelease).toEqual(["en"]);
    await waitFor(() => expect(sent).toEqual(["en", "es"]));
  });
});
