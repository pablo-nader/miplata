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

test.describe("categories", () => {
  test.use({ locale: "es-AR" });

  test("creates a category with an icon and finds it in the category picker", async ({ page }) => {
    // Arrange
    await mockSignedIn(page);
    await mockCategoriesApi(page);
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
    await page.getByRole("button", { name: "Todas" }).click();
    const picked = page.getByRole("button", { name: "Jardinería" });
    await expect(picked).toBeVisible();
    await expect(picked.locator("svg.lucide-droplet")).toBeVisible();
    await picked.click();
    await expect(picked).toHaveAttribute("aria-pressed", "true");
  });

  test("deactivated categories are not offered in the picker", async ({ page }) => {
    // Arrange
    await mockSignedIn(page);
    await mockCategoriesApi(page);
    await page.goto("/categories");

    // Act
    await page.getByRole("link", { name: "Alquiler" }).click();
    await page.getByRole("button", { name: "Desactivar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();

    // Assert
    await expect(page.getByRole("link", { name: /Alquiler/ })).toContainText("Inactiva");
    await page.goto("/movements/new");
    await page.getByRole("button", { name: "Todas" }).click();
    await expect(page.getByRole("button", { name: "Mantenimiento" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Alquiler" })).toHaveCount(0);
  });
});
