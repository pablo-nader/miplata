import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeCategoriesBackend,
  type FakeCategoriesBackend,
  stubFetchWith,
} from "../../test/fake-categories-backend";
import { renderApp } from "../../test/render";
import { CategoriesContainer } from "./CategoriesContainer";
import { CategoryEditorContainer } from "./CategoryEditorContainer";
import { CategoryPickerContainer } from "./CategoryPickerContainer";
import { GroupEditorContainer } from "./GroupEditorContainer";

let backend: FakeCategoriesBackend;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  backend = createFakeCategoriesBackend();
  fetchMock = vi.fn(stubFetchWith(backend));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Picker() {
  const [value, setValue] = useState<string | null>(null);
  return (
    <>
      <CategoryPickerContainer type="expense" value={value} onChange={setValue} />
      <p data-testid="picked">{value ?? "none"}</p>
    </>
  );
}

function renderAt(path: string, language: "es" | "en" = "es") {
  return renderApp(
    <Routes>
      <Route path="/menu" element={<p>menu</p>} />
      <Route path="/categories" element={<CategoriesContainer />} />
      <Route path="/categories/new" element={<CategoryEditorContainer mode="new" />} />
      <Route path="/categories/groups/new" element={<GroupEditorContainer mode="new" />} />
      <Route path="/categories/groups/:groupId" element={<GroupEditorContainer mode="edit" />} />
      <Route path="/categories/:categoryId" element={<CategoryEditorContainer mode="edit" />} />
      <Route path="/picker" element={<Picker />} />
    </Routes>,
    language,
    path,
  );
}

function requestsTo(method: string) {
  return fetchMock.mock.calls.filter(
    ([, init]) => (init as RequestInit | undefined)?.method === method,
  );
}

describe("categories screen", () => {
  it("shows groups and categories with translated default names, in Spanish", async () => {
    // Arrange
    renderAt("/categories");

    // Act
    const housing = await screen.findByRole("heading", { name: "Vivienda" });

    // Assert
    expect(housing).toBeDefined();
    expect(screen.getByRole("link", { name: "Alquiler" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Mantenimiento" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Comida" })).toBeDefined();
  });

  it("translates the default names to English", async () => {
    // Arrange
    renderAt("/categories", "en");

    // Act
    const housing = await screen.findByRole("heading", { name: "Housing" });

    // Assert
    expect(housing).toBeDefined();
    expect(screen.getByRole("link", { name: "Rent" })).toBeDefined();
  });

  it("lists income categories on their own tab without groups", async () => {
    // Arrange
    renderAt("/categories");
    await screen.findByRole("heading", { name: "Vivienda" });

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "Ingresos" }));

    // Assert
    expect(screen.getByRole("link", { name: "Sueldo" })).toBeDefined();
    expect(screen.queryByRole("heading", { name: "Vivienda" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Agregar grupo" })).toBeNull();
  });

  it("shows a custom name after the default was renamed", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));

    // Act
    const name = await screen.findByLabelText("Nombre");
    await userEvent.clear(name);
    await userEvent.type(name, "Mi alquiler");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByRole("link", { name: "Mi alquiler" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Alquiler" })).toBeNull();
    expect(backend.categories.find((item) => item.name === "Mi alquiler")?.nameKey).toBeNull();
  });

  it("opens on the income tab when asked to", async () => {
    // Arrange
    renderAt("/categories?tab=income");

    // Act
    const salary = await screen.findByRole("link", { name: "Sueldo" });

    // Assert
    expect(salary).toBeDefined();
    expect((screen.getByRole("radio", { name: "Ingresos" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("marks inactive categories", async () => {
    // Arrange
    const target = backend.categories.find((item) => item.nameKey === "defaults.category.rent");
    if (target) target.isActive = false;

    // Act
    renderAt("/categories");
    const row = await screen.findByRole("link", { name: /Alquiler/ });

    // Assert
    expect(within(row).getByText("Inactiva")).toBeDefined();
  });

  it("offers to retry when loading fails", async () => {
    // Arrange
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    renderAt("/categories");

    // Act
    const retry = await screen.findByRole("button", { name: "Reintentar" });
    await userEvent.click(retry);

    // Assert
    expect(await screen.findByRole("heading", { name: "Vivienda" })).toBeDefined();
  });
});

describe("creating a category", () => {
  it("creates it in the chosen group with an icon and shows it in the list", async () => {
    // Arrange
    renderAt("/categories");
    const addLinks = await screen.findAllByRole("link", { name: "Agregar categoría" });

    // Act
    await userEvent.click(addLinks[1] as HTMLElement);
    await userEvent.type(await screen.findByLabelText("Nombre"), "  Verdulería ");
    await userEvent.click(screen.getByRole("button", { name: "Gota" }));
    await userEvent.click(screen.getByRole("button", { name: "Color 3" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByRole("link", { name: "Verdulería" })).toBeDefined();
    const created = backend.categories.find((item) => item.name === "Verdulería");
    expect(created).toMatchObject({
      type: "expense",
      icon: "droplet",
      color: 3,
      groupId: backend.groups[1]?.id,
    });
  });

  it("creates an income category from the income tab", async () => {
    // Arrange
    renderAt("/categories");
    await screen.findByRole("heading", { name: "Vivienda" });
    await userEvent.click(screen.getByRole("radio", { name: "Ingresos" }));

    // Act
    await userEvent.click(screen.getByRole("link", { name: "Agregar categoría" }));
    await userEvent.type(await screen.findByLabelText("Nombre"), "Premio");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    await waitFor(() =>
      expect(backend.categories.find((item) => item.name === "Premio")).toMatchObject({
        type: "income",
        groupId: null,
        icon: null,
      }),
    );
    expect(screen.queryByRole("group", { name: "Grupo" })).toBeNull();
  });

  it("asks for a name before calling the api", async () => {
    // Arrange
    renderAt("/categories/new");
    await screen.findByLabelText("Nombre");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByText("Escribí un nombre.")).toBeDefined();
    expect(requestsTo("POST")).toHaveLength(0);
  });

  it("rejects names that are too long without calling the api", async () => {
    // Arrange
    renderAt("/categories/new");

    // Act
    await userEvent.type(await screen.findByLabelText("Nombre"), "x".repeat(41));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByText(/hasta 40 caracteres/)).toBeDefined();
    expect(requestsTo("POST")).toHaveLength(0);
  });

  it("reports a name that is already taken and stays on the form", async () => {
    // Arrange
    renderAt("/categories/new?type=income");
    await userEvent.type(await screen.findByLabelText("Nombre"), "Premio");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await screen.findByRole("heading", { name: "Categorías" });
    renderAt("/categories/new?type=income");

    // Act
    const names = await screen.findAllByLabelText("Nombre");
    await userEvent.type(names.at(-1) as HTMLElement, "premio");
    await userEvent.click(screen.getAllByRole("button", { name: "Guardar" }).at(-1) as HTMLElement);

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Ya tenés algo con ese nombre",
    );
  });

  it("needs a group for an expense when the user has none", async () => {
    // Arrange
    backend.groups.length = 0;
    renderAt("/categories/new");
    await userEvent.type(await screen.findByLabelText("Nombre"), "Algo");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain("Primero creá un grupo");
  });

  it("shows a generic message when the request cannot be made", async () => {
    // Arrange
    renderAt("/categories/new?type=income");
    await userEvent.type(await screen.findByLabelText("Nombre"), "Premio");
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain("No pudimos completar");
  });
});

describe("editing a category", () => {
  it("sends only what changed", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await screen.findByLabelText("Nombre");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Color 4" }));
    await userEvent.click(screen.getByRole("button", { name: "Sin ícono (primera letra)" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    await screen.findByRole("heading", { name: "Vivienda" });
    const [, init] = requestsTo("PATCH")[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ icon: null, color: 4 });
  });

  it("moves an expense category to another group", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await screen.findByLabelText("Nombre");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Comida" }));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    await screen.findByRole("heading", { name: "Vivienda" });
    const rent = backend.categories.find((item) => item.nameKey === "defaults.category.rent");
    expect(rent?.groupId).toBe(backend.groups[1]?.id);
  });

  it("goes back without calling the api when nothing changed", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await screen.findByLabelText("Nombre");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByRole("heading", { name: "Categorías" })).toBeDefined();
    expect(requestsTo("PATCH")).toHaveLength(0);
  });

  it("returns to the income tab after saving an income category", async () => {
    // Arrange
    renderAt("/categories?tab=income");
    await userEvent.click(await screen.findByRole("link", { name: "Sueldo" }));
    await userEvent.click(await screen.findByRole("button", { name: "Color 2" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByRole("link", { name: "Sueldo" })).toBeDefined();
    expect((screen.getByRole("radio", { name: "Ingresos" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("hides the form while a confirmation is open and brings focus back on cancel", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));
    const hidden = screen.getByLabelText("Nombre").closest("form")?.hidden;

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(hidden).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("heading", { name: "Editar categoría" }));
  });

  it("explains when the category no longer exists", async () => {
    // Arrange
    renderAt("/categories/00000000-0000-4000-8000-999999999999");

    // Act
    const message = await screen.findAllByText("Ya no existe. Volvé a la lista.");

    // Assert
    expect(message.length).toBeGreaterThan(0);
  });

  it("deactivates after a confirmation that explains the effect, then reactivates", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await userEvent.click(await screen.findByRole("button", { name: "Desactivar" }));

    // Act
    const dialog = screen.getByRole("alertdialog", { name: "¿Desactivar Alquiler?" });
    const explained = within(dialog).getByText(/No se va a ofrecer al cargar movimientos nuevos/);
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    expect(explained).toBeDefined();
    const row = await screen.findByRole("link", { name: /Alquiler/ });
    expect(within(row).getByText("Inactiva")).toBeDefined();
    await userEvent.click(row);
    await userEvent.click(await screen.findByRole("button", { name: "Reactivar" }));
    expect(await screen.findByRole("link", { name: "Alquiler" })).toBeDefined();
    expect(
      backend.categories.find((item) => item.nameKey === "defaults.category.rent")?.isActive,
    ).toBe(true);
  });

  it("keeps the category when the deactivation is cancelled", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await userEvent.click(await screen.findByRole("button", { name: "Desactivar" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(requestsTo("POST")).toHaveLength(0);
  });

  it("deletes after a confirmation", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    // Act
    const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar Alquiler?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    await screen.findByRole("heading", { name: "Vivienda" });
    expect(screen.queryByRole("link", { name: "Alquiler" })).toBeNull();
    expect(backend.categories.some((item) => item.nameKey === "defaults.category.rent")).toBe(
      false,
    );
  });

  it("explains that a category with movements can only be deactivated", async () => {
    // Arrange
    const used = backend.categories.find((item) => item.nameKey === "defaults.category.rent");
    backend.markUsed(used?.id ?? "");
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Alquiler" }));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("tiene movimientos");
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(backend.categories.some((item) => item.id === used?.id)).toBe(true);
  });
});

describe("groups", () => {
  it("creates a group and lists it", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Agregar grupo" }));

    // Act
    await userEvent.type(await screen.findByLabelText("Nombre"), "Mascotas");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByRole("heading", { name: "Mascotas" })).toBeDefined();
  });

  it("renames a default group", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Editar grupo Vivienda" }));
    const name = await screen.findByLabelText("Nombre");

    // Act
    await userEvent.clear(name);
    await userEvent.type(name, "Casa");
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByRole("heading", { name: "Casa" })).toBeDefined();
  });

  it("goes back without calling the api when the group name did not change", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Editar grupo Vivienda" }));
    await screen.findByLabelText("Nombre");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(await screen.findByRole("heading", { name: "Categorías" })).toBeDefined();
    expect(requestsTo("PATCH")).toHaveLength(0);
  });

  it("validates the group name and reports a duplicate", async () => {
    // Arrange
    renderAt("/categories/groups/new");
    await screen.findByLabelText("Nombre");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));
    const required = await screen.findByText("Escribí un nombre.");
    await userEvent.type(screen.getByLabelText("Nombre"), "x".repeat(41));
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect(required).toBeDefined();
    expect(await screen.findByText(/hasta 40 caracteres/)).toBeDefined();
    expect(requestsTo("POST")).toHaveLength(0);
  });

  it("shows the duplicate-name message from the api", async () => {
    // Arrange
    backend.groups.push({
      id: "11111111-1111-4111-8111-111111111111",
      nameKey: null,
      name: "Mascotas",
      sortOrder: 9,
    });
    renderAt("/categories/groups/new");
    await userEvent.type(await screen.findByLabelText("Nombre"), "mascotas");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Guardar" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Ya tenés algo con ese nombre",
    );
  });

  it("refuses to delete a group that still has categories", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Editar grupo Vivienda" }));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar grupo" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));

    // Assert
    expect((await screen.findByRole("alert")).textContent).toContain("todavía tiene categorías");
    expect(backend.groups).toHaveLength(2);
  });

  it("deletes an empty group after a confirmation", async () => {
    // Arrange
    backend.categories.splice(0, backend.categories.length);
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Editar grupo Comida" }));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar grupo" }));

    // Act
    const dialog = screen.getByRole("alertdialog", { name: "¿Eliminar el grupo Comida?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));

    // Assert
    await screen.findByRole("heading", { name: "Vivienda" });
    expect(screen.queryByRole("heading", { name: "Comida" })).toBeNull();
  });

  it("cancels the group deletion", async () => {
    // Arrange
    renderAt("/categories");
    await userEvent.click(await screen.findByRole("link", { name: "Editar grupo Comida" }));
    await userEvent.click(await screen.findByRole("button", { name: "Eliminar grupo" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    // Assert
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(requestsTo("DELETE")).toHaveLength(0);
  });

  it("explains when the group no longer exists", async () => {
    // Arrange
    renderAt("/categories/groups/00000000-0000-4000-8000-999999999999");

    // Act
    const message = await screen.findAllByText("Ya no existe. Volvé a la lista.");

    // Assert
    expect(message.length).toBeGreaterThan(0);
  });

  it("offers to retry when the editor cannot load", async () => {
    // Arrange
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    renderAt("/categories/groups/new");

    // Act
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    // Assert
    expect(await screen.findByLabelText("Nombre")).toBeDefined();
  });
});

describe("category picker container", () => {
  it("offers the active expense categories and reports the selection", async () => {
    // Arrange
    const inactive = backend.categories.find((item) => item.nameKey === "defaults.category.rent");
    if (inactive) inactive.isActive = false;
    renderAt("/picker");

    // Act
    await userEvent.click(await screen.findByRole("button", { name: "Todas" }));
    await userEvent.click(screen.getByRole("button", { name: "Supermercado" }));

    // Assert
    expect(screen.queryByRole("button", { name: "Alquiler" })).toBeNull();
    expect(screen.getByTestId("picked").textContent).toBe(
      backend.categories.find((item) => item.nameKey === "defaults.category.groceries")?.id,
    );
  });

  it("shows a category created a moment ago", async () => {
    // Arrange
    backend.handle("POST", "/api/categories", {
      type: "expense",
      groupId: backend.groups[0]?.id,
      name: "Jardinería",
      icon: "sparkles",
      color: 2,
    });
    renderAt("/picker");

    // Act
    await userEvent.click(await screen.findByRole("button", { name: "Todas" }));

    // Assert
    expect(screen.getByRole("button", { name: "Jardinería" })).toBeDefined();
  });

  it("offers to retry when the categories cannot be loaded", async () => {
    // Arrange
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    renderAt("/picker");

    // Act
    await userEvent.click(await screen.findByRole("button", { name: "Reintentar" }));

    // Assert
    expect(await screen.findByRole("button", { name: "Todas" })).toBeDefined();
  });
});
