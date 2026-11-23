import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { statementLookups } from "../../test/fake-statements";
import { renderApp } from "../../test/render";
import { PayStatementContainer } from "./PayStatementContainer";

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
        <Route path="/accounts/:accountId/statement/pay" element={<PayStatementContainer />} />
      </Routes>,
      "es",
      "/accounts/card-1/statement/pay?period=2026-11",
    );

    // Act
    const submit = await screen.findByRole("button", { name: /^Pagar / });

    // Assert
    expect((submit as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen
        .getByText("Estás sin conexión: guardar no está disponible hasta que vuelva la conexión.")
        .closest('[role="status"]'),
    ).not.toBeNull();
  });
});
