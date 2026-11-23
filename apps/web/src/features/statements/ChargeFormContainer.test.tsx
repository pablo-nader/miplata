import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { statementLookups } from "../../test/fake-statements";
import { renderApp } from "../../test/render";
import { ChargeFormContainer } from "./ChargeFormContainer";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("when the browser is offline", () => {
  it("disables saving and explains why next to the button", async () => {
    // Arrange
    stubApi(statementLookups);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderApp(
      <Routes>
        <Route path="/accounts/:accountId/statement/charge" element={<ChargeFormContainer />} />
      </Routes>,
      "es",
      "/accounts/card-1/statement/charge?period=2026-11",
    );

    // Act
    const save = await screen.findByRole("button", { name: "Guardar cargo" });

    // Assert
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen
        .getByText("Estás sin conexión: guardar no está disponible hasta que vuelva la conexión.")
        .closest('[role="status"]'),
    ).not.toBeNull();
  });
});
