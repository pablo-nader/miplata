import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeCategoriesBackend, stubFetchWith } from "../../test/fake-categories-backend";
import { renderApp } from "../../test/render";
import { CategoryEditorContainer } from "./CategoryEditorContainer";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function renderEditor(path: string) {
  return renderApp(
    <Routes>
      <Route path="/categories" element={<p>categories list</p>} />
      <Route path="/categories/new" element={<CategoryEditorContainer mode="new" />} />
      <Route path="/categories/:categoryId" element={<CategoryEditorContainer mode="edit" />} />
    </Routes>,
    "es",
    path,
  );
}

describe("when the browser is offline", () => {
  it("disables saving and explains why next to the button", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn(stubFetchWith(createFakeCategoriesBackend())));
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    renderEditor("/categories/new");

    // Act
    const save = await screen.findByRole("button", { name: "Guardar" });

    // Assert
    expect((save as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen
        .getByText("Estás sin conexión: guardar no está disponible hasta que vuelva la conexión.")
        .closest('[role="status"]'),
    ).not.toBeNull();
  });
});
