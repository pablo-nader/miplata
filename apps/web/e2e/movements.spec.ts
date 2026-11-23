import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

const both = [
  { currency: "ARS", openingBalanceMinor: 0 },
  { currency: "USD", openingBalanceMinor: 0 },
];

async function pickCategory(page: Page, name: string) {
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("option", { name }).click();
}

test.beforeEach(async ({ context }) => {
  await signInAsNewUser(context);
  const group = await context.request.post("http://localhost:4173/api/category-groups", {
    data: { name: "Comida" },
  });
  await context.request.post("http://localhost:4173/api/categories", {
    data: {
      type: "expense",
      groupId: ((await group.json()) as { id: string }).id,
      name: "Supermercado",
      icon: null,
      color: 1,
    },
  });
  await context.request.post("http://localhost:4173/api/accounts", {
    data: { type: "cash", name: "Billetera", currencies: both },
  });
  await context.request.post("http://localhost:4173/api/accounts", {
    data: {
      type: "credit_card",
      name: "Visa Galicia",
      closingDay: 20,
      dueDay: 5,
      currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    },
  });
});

test("records an expense, a card purchase in 3 installments and a dollar purchase", async ({
  page,
}) => {
  // Arrange
  await page.goto("/home");
  await expect(page.getByText("Acá vas a ver tu saldo y tus últimos movimientos.")).toBeVisible();

  // Act
  await page.getByRole("link", { name: "Nuevo movimiento" }).first().click();
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Billetera" });
  await page.getByLabel("Monto").fill("48.300");
  await pickCategory(page, "Supermercado");
  await page.getByLabel("Descripción").fill("Coto");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.getByRole("link", { name: "Nuevo movimiento" }).first().click();
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Visa Galicia" });
  await page.getByLabel("Cuotas").selectOption("3");
  await page.getByLabel("Monto").fill("900.000");
  await expect(page.getByText(/3 de \$\s300\.000/)).toBeVisible();
  await pickCategory(page, "Supermercado");
  await page.getByLabel("Descripción").fill("Heladera");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.getByRole("link", { name: "Nuevo movimiento" }).first().click();
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Billetera" });
  await page.getByRole("button", { name: "USD" }).click();
  await page.getByLabel("Monto").fill("120");
  await pickCategory(page, "Supermercado");
  await page.getByLabel("Descripción").fill("Zapatillas importadas");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/home$/);

  // Assert
  const latest = page.getByRole("region", { name: "Últimos movimientos" });
  await expect(latest.getByText("Coto")).toBeVisible();
  await expect(latest.getByText("Heladera")).toBeVisible();
  await expect(latest.getByText("Zapatillas importadas")).toBeVisible();
  await expect(latest.getByText(/^−\s\$\s48\.300$/)).toBeVisible();
  await expect(latest.getByText(/^−\sUS\$\s120$/)).toBeVisible();
  await expect(
    page
      .locator(".signage-band")
      .getByText(/US\$\s120/)
      .first(),
  ).toBeVisible();

  await page.getByRole("link", { name: "Movimientos", exact: true }).first().click();
  await expect(page).toHaveURL(/\/movements$/);
  const heladera = page.getByRole("link", { name: /Heladera/ });
  await expect(heladera).toContainText("1/3");
  await expect(heladera).toContainText("Visa Galicia");
  await expect(heladera).toContainText(/\$\s300\.000/);
  await expect(page.getByRole("link", { name: /Coto/ })).toContainText("Billetera");
});

test("searches, edits and deletes a movement", async ({ page }) => {
  // Arrange
  await page.goto("/movements/new");
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Billetera" });
  await page.getByLabel("Monto").fill("5.000");
  await pickCategory(page, "Supermercado");
  await page.getByLabel("Descripción").fill("Plomero");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/movements");

  // Act
  await page.getByRole("searchbox", { name: "Buscar por descripción" }).fill("plom");
  await expect(page.getByRole("link", { name: /Plomero/ })).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar por descripción" }).fill("zzz");
  await expect(page.getByText("No hay movimientos")).toBeVisible();
  await page.getByRole("searchbox", { name: "Buscar por descripción" }).fill("plom");
  await page.getByRole("link", { name: /Plomero/ }).click();
  await page.getByLabel("Monto").fill("7.500");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  // Assert
  await expect(page).toHaveURL(/\/movements$/);
  await expect(page.getByRole("link", { name: /Plomero/ })).toContainText(/\$\s7\.500/);
  await page.getByRole("link", { name: /Plomero/ }).click();
  await page.getByRole("button", { name: "Eliminar movimiento" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page).toHaveURL(/\/movements$/);
  await expect(page.getByText("Plomero")).toHaveCount(0);
});

test("finds a movement without accents and clears the search and filters in one tap", async ({
  page,
}) => {
  // Arrange
  await page.goto("/movements/new");
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Billetera" });
  await page.getByLabel("Monto").fill("2.500");
  await pickCategory(page, "Supermercado");
  await page.getByLabel("Descripción").fill("Café con leche");
  await page.getByRole("button", { name: "Guardar gasto" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/movements");

  // Act
  await page.getByRole("searchbox", { name: "Buscar por descripción" }).fill("CAFE");

  // Assert
  await expect(page.getByRole("link", { name: /Café con leche/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Quitar filtro Búsqueda/ })).toBeVisible();
  await page.getByRole("button", { name: "Limpiar todo" }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar por descripción" })).toHaveValue("");
  await expect(page.getByRole("button", { name: /Quitar filtro/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Limpiar todo" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Café con leche/ })).toBeVisible();
});

test("records a dollar purchase as an exchange transfer that is not an expense", async ({
  page,
}) => {
  // Arrange
  await page.goto("/movements/new");

  // Act
  await page.locator("label", { hasText: "Transferencia" }).click();
  await page.getByLabel("Cuenta de origen").selectOption({ label: "Billetera" });
  await page.getByLabel("Cuenta de destino").selectOption({ label: "Billetera" });
  await page.getByRole("button", { name: "USD" }).nth(1).click();
  await page.getByLabel("Monto que sale").fill("1.230.000");
  await page.getByLabel("Monto que entra").fill("1.000");
  await page.getByLabel("Descripción").fill("Compra de dólares");
  await expect(page.getByRole("status")).toContainText("Cotización $ 1.230 por dólar");
  await page.getByRole("button", { name: "Guardar transferencia" }).click();

  // Assert
  await expect(page).toHaveURL(/\/home$/);
  const row = page.getByRole("link", { name: /Compra de dólares/ });
  await expect(row).toContainText(/US\$\s1\.000/);
  await expect(row).toContainText(/\$\s1\.230\.000/);
  await expect(page.locator(".signage-band")).toContainText("Salió en");
  await expect(page.locator(".signage-band")).toContainText(/Salió en \S+\s*\$\s0(?![.\d])/);
});

test("finds a category by typing without accents and without scrolling", async ({
  page,
  context,
}) => {
  // Arrange
  const group = await context.request.post("http://localhost:4173/api/category-groups", {
    data: { name: "Mascotas" },
  });
  await context.request.post("http://localhost:4173/api/categories", {
    data: {
      type: "expense",
      groupId: ((await group.json()) as { id: string }).id,
      name: "Veterinaría",
      icon: null,
      color: 2,
    },
  });
  await page.goto("/movements/new");

  // Act
  await page.getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByRole("searchbox")).toBeFocused();
  await page.keyboard.type("VETERINARIA");
  await expect(page.getByRole("dialog").getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");

  // Assert
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Veterinaría" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("creates a person from the form and records an expense for them", async ({ page }) => {
  // Arrange
  await page.goto("/movements/new");
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Billetera" });
  await page.getByLabel("Monto").fill("12.000");
  await pickCategory(page, "Supermercado");
  await page.getByLabel("Descripción").fill("Compra para Sofi");

  // Act
  await page.getByRole("switch", { name: "Es de otra persona" }).click();
  await page.getByLabel("Persona", { exact: true }).selectOption({ label: "+ Nueva persona" });
  await page.getByLabel("Nombre de la persona").fill("Sofi");
  await page.getByRole("button", { name: "Crear persona" }).click();
  await expect(page.getByLabel("Persona", { exact: true })).toHaveValue(/.+/);
  await page.getByRole("button", { name: "Guardar gasto" }).click();

  // Assert
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/accounts");
  const people = page.getByRole("region", { name: "Personas" });
  await expect(people.getByRole("link", { name: /Sofi/ })).toContainText(/\$\s12\.000/);
});
