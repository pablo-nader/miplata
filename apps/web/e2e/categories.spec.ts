import { expect, type Page, test } from "@playwright/test";
import { createFakeCategoriesBackend } from "../src/test/fake-categories-backend";
import { mockSignedIn } from "./session";

async function mockCategoriesApi(page: Page) {
  const backend = createFakeCategoriesBackend();
  await page.route(/\/api\/(categories|category-groups)/, async (route) => {
    const request = route.request();
    const raw = request.postData();
    const result = backend.handle(
      request.method(),
      new URL(request.url()).pathname,
      raw ? JSON.parse(raw) : undefined,
    );
    await route.fulfill({
      status: result.status,
      contentType: "application/json",
      body: result.body === undefined ? "" : JSON.stringify(result.body),
    });
  });
  return backend;
}

async function mockNoAccounts(page: Page) {
  await page.route("**/api/accounts", (route) => route.fulfill({ json: [] }));
  await page.route("**/api/people", (route) => route.fulfill({ json: [] }));
}

test.describe("categories", () => {
  test.use({ locale: "es-AR" });

  test("creates a category with an icon and finds it in the category picker", async ({ page }) => {
    // Arrange
    await mockSignedIn(page);
    await mockCategoriesApi(page);
    await mockNoAccounts(page);
    await page.goto("/menu");

    // Act
    await page.getByRole("link", { name: "Categorías" }).click();
    await page.getByRole("link", { name: "Agregar categoría" }).first().click();
    await page.getByLabel("Nombre").fill("Jardinería");
    await page.getByRole("button", { name: "Gota" }).click();
    await page.getByRole("button", { name: "Guardar" }).click();

    // Assert
    await expect(page.getByRole("link", { name: "Jardinería" })).toBeVisible();
    await page.goto("/movements/new");
    await page.getByRole("button", { name: "Buscar" }).click();
    const option = page.getByRole("option", { name: "Jardinería" });
    await expect(option).toBeVisible();
    await expect(option.locator("svg.lucide-droplet")).toBeVisible();
    await option.click();
    await expect(page.getByRole("button", { name: "Jardinería" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("deactivated categories are not offered in the picker", async ({ page }) => {
    // Arrange
    await mockSignedIn(page);
    await mockCategoriesApi(page);
    await mockNoAccounts(page);
    await page.goto("/categories");

    // Act
    await page.getByRole("link", { name: "Alquiler" }).click();
    await page.getByRole("button", { name: "Desactivar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    // Assert
    await expect(page.getByRole("link", { name: /Alquiler/ })).toContainText("Inactiva");
    await page.goto("/movements/new");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByRole("option", { name: "Mantenimiento" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Alquiler" })).toHaveCount(0);
  });
});
