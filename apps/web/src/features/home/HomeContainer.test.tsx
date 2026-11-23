import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n, type Language } from "../../app/i18n";
import { HomeContainer } from "./HomeContainer";

function renderHome(language: Language, request: typeof fetch) {
  return render(
    <I18nextProvider i18n={createI18n(language)}>
      <HomeContainer request={request} />
    </I18nextProvider>,
  );
}

const healthy: typeof fetch = async () =>
  new Response(JSON.stringify({ status: "ok", version: "9.9.9" }));
const failing: typeof fetch = async () => new Response("{}", { status: 503 });

describe("HomeContainer", () => {
  it("shows the connected status and version in Spanish", async () => {
    // Arrange
    renderHome("es", healthy);

    // Act
    const status = await screen.findByText("Conectado");

    // Assert
    expect(status).toBeDefined();
    expect(screen.getByText("Versión 9.9.9")).toBeDefined();
    expect(screen.getByRole("heading", { name: "miPlata" })).toBeDefined();
  });

  it("shows the connected status in English", async () => {
    // Arrange
    renderHome("en", healthy);

    // Act
    const status = await screen.findByText("Connected");

    // Assert
    expect(status).toBeDefined();
  });

  it("shows the checking state before the answer arrives", () => {
    // Arrange
    renderHome("en", () => new Promise(() => undefined));

    // Act
    const status = screen.getByText("Checking…");

    // Assert
    expect(status).toBeDefined();
  });

  it("shows the unavailable state when the server fails", async () => {
    // Arrange
    renderHome("es", failing);

    // Act
    const status = await screen.findByText("Sin conexión con el servidor");

    // Assert
    expect(status).toBeDefined();
    expect(screen.queryByText(/Versión/)).toBeNull();
  });
});
