import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyBalance, stubApi } from "../../test/fake-api";
import { lookupHandlers, makeMovement } from "../../test/fake-movements";
import {
  electricity,
  internet,
  makeOccurrence,
  occurrenceList,
  rent,
  salary,
  unpriced,
} from "../../test/fake-recurring";
import { renderApp } from "../../test/render";
import { HomeContainer } from "./HomeContainer";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 10, 25, 12));
});

afterEach(() => {
  vi.useRealTimers();
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

  it("shows the month's money in and out and the latest movements", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      "GET /api/balance": { body: emptyBalance },
      "GET /api/movements/summary?month=2026-11": {
        body: {
          month: "2026-11",
          totals: [
            { currency: "ARS", inMinor: 1_250_000_00, outMinor: 873_400_00 },
            { currency: "USD", inMinor: 0, outMinor: 120_00 },
          ],
        },
      },
      "GET /api/movements?limit=5&offset=0": {
        body: { items: [makeMovement()], hasMore: false },
      },
    });

    // Act
    renderApp(<HomeContainer />, "es");
    const latest = await screen.findByRole("region", { name: "Últimos movimientos" });

    // Assert
    const band = screen.getByRole("banner");
    expect(text(band)).toContain("Entró en noviembre");
    expect(text(band)).toContain("$ 1.250.000");
    expect(text(band)).toContain("Salió en noviembre");
    expect(text(band)).toContain("$ 873.400 · US$ 120");
    expect(text(latest)).toContain("Coto");
    expect(text(latest)).toContain("− $ 48.300");
  });

  it("invites to record the first movement when there are none", async () => {
    // Arrange
    stubApi({
      ...lookupHandlers,
      "GET /api/balance": { body: emptyBalance },
      "GET /api/movements?limit=5&offset=0": { body: { items: [], hasMore: false } },
    });

    // Act
    renderApp(<HomeContainer />, "es");

    // Assert
    expect(
      await screen.findByText("Acá vas a ver tu saldo y tus últimos movimientos."),
    ).toBeDefined();
  });

  describe("pending banner", () => {
    const pendingKey = "GET /api/recurring/occurrences?type=expense";

    it("summarises what is overdue or due today and links to the to-pay screen", async () => {
      // Arrange
      stubApi({
        ...lookupHandlers,
        "GET /api/balance": { body: emptyBalance },
        [pendingKey]: occurrenceList([internet, rent, electricity]),
      });

      // Act
      renderApp(<HomeContainer />, "es");
      const banner = await screen.findByRole("link", { name: /por pagar/ });

      // Assert
      expect(banner.getAttribute("href")).toBe("/to-pay");
      expect(text(banner)).toContain("2 por pagar");
      expect(text(banner)).toContain("Luz venció 20/11 · $ 41.500");
    });

    it("says an item is due today and omits an unknown amount", async () => {
      // Arrange
      stubApi({
        ...lookupHandlers,
        "GET /api/balance": { body: emptyBalance },
        [pendingKey]: occurrenceList([
          makeOccurrence({ description: null, amountMode: "variable", suggestedAmountMinor: null }),
        ]),
      });

      // Act
      renderApp(<HomeContainer />, "en");
      const banner = await screen.findByRole("link", { name: /to pay/ });

      // Assert
      expect(text(banner)).toContain("1 to pay");
      expect(text(banner)).toContain("Mantenimiento due today");
      expect(text(banner)).not.toContain("$");
    });

    it.each([
      ["only upcoming expenses", [internet]],
      ["only receivables", [salary]],
      ["nothing", []],
    ])("is hidden with %s", async (_name, items) => {
      // Arrange
      stubApi({
        ...lookupHandlers,
        "GET /api/balance": { body: emptyBalance },
        [pendingKey]: occurrenceList(items),
      });

      // Act
      renderApp(<HomeContainer />, "es");
      await screen.findByRole("link", { name: /Saldo total/ });

      // Assert
      expect(screen.queryByRole("link", { name: /por pagar/ })).toBeNull();
    });

    it("keeps the home usable when the pending request fails", async () => {
      // Arrange
      stubApi({
        ...lookupHandlers,
        "GET /api/balance": { body: emptyBalance },
        [pendingKey]: { status: 500, body: { error: "boom" } },
      });

      // Act
      renderApp(<HomeContainer />, "es");

      // Assert
      expect(await screen.findByRole("link", { name: /Saldo total/ })).toBeDefined();
      expect(screen.queryByRole("link", { name: /por pagar/ })).toBeNull();
    });

    it("keeps unpriced items out of the amount", async () => {
      // Arrange
      stubApi({
        ...lookupHandlers,
        "GET /api/balance": { body: emptyBalance },
        [pendingKey]: occurrenceList([unpriced]),
      });

      // Act
      renderApp(<HomeContainer />, "es");
      const banner = await screen.findByRole("link", { name: /por pagar/ });

      // Assert
      expect(text(banner)).toContain("Expensas venció 24/11");
    });
  });
});
