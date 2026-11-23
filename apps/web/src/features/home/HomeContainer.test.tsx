import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyBalance, stubApi } from "../../test/fake-api";
import { renderApp } from "../../test/render";
import { HomeContainer } from "./HomeContainer";

afterEach(() => {
  vi.unstubAllGlobals();
});

function text(element: HTMLElement) {
  return (element.textContent ?? "").replaceAll(" ", " ");
}

describe("HomeContainer", () => {
  it("shows the total balance in pesos and dollars and links to the detail", async () => {
    // Arrange
    stubApi({
      "GET /api/balance": {
        body: {
          totals: [
            { currency: "ARS", totalMinor: 1_884_300_00 },
            { currency: "USD", totalMinor: 1_450_00 },
          ],
          lines: [],
        },
      },
    });

    // Act
    renderApp(<HomeContainer />, "es");
    const balance = await screen.findByRole("link", { name: /Saldo total/ });

    // Assert
    expect(balance.getAttribute("href")).toBe("/balance");
    expect(text(balance)).toContain("$ 1.884.300");
    expect(text(balance)).toContain("US$ 1.450");
  });

  it("hides the dollar total when it is zero", async () => {
    // Arrange
    stubApi({
      "GET /api/balance": {
        body: {
          totals: [
            { currency: "ARS", totalMinor: 50_000 },
            { currency: "USD", totalMinor: 0 },
          ],
          lines: [],
        },
      },
    });

    // Act
    renderApp(<HomeContainer />, "es");
    const balance = await screen.findByRole("link", { name: /Saldo total/ });

    // Assert
    expect(text(balance)).toContain("$ 500");
    expect(text(balance)).not.toContain("US$");
  });

  it("shows no balance when there are no accounts yet", async () => {
    // Arrange
    stubApi({ "GET /api/balance": { body: emptyBalance } });

    // Act
    renderApp(<HomeContainer />, "es");
    const balance = await screen.findByRole("link", { name: /Saldo total/ });

    // Assert
    expect(text(balance)).toContain("$ 0");
  });

  it("keeps the home usable when the balance cannot be loaded", async () => {
    // Arrange
    stubApi({});

    // Act
    renderApp(<HomeContainer />, "es");

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "miPlata" })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Saldo total/ })).toBeNull();
  });
});
