import { expect, type Page, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ context }) => {
  await signInAsNewUser(context);
});

function localToday() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

async function post(page: Page, path: string, data: unknown) {
  const response = await page.request.post(path, { data });
  expect(response.status(), path).toBe(201);
  return (await response.json()) as { id: string };
}

async function seedGroceriesSpending(page: Page) {
  const group = await post(page, "/api/category-groups", { name: "Casa" });
  const category = await post(page, "/api/categories", {
    type: "expense",
    groupId: group.id,
    name: "Verdulería",
    icon: null,
    color: 1,
  });
  const cash = await post(page, "/api/accounts", {
    type: "cash",
    name: "Caja",
    currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
  });
  await post(page, "/api/movements", {
    type: "expense",
    occurredOn: localToday(),
    categoryId: category.id,
    accountId: cash.id,
    currency: "ARS",
    amountMinor: 800000,
  });
}

test("creates a budget from the menu and shows its progress", async ({ page }) => {
  // Arrange
  await seedGroceriesSpending(page);
  await page.goto("/menu");

  // Act
  await page.getByRole("link", { name: "Presupuestos" }).click();
  await expect(page.getByText("Todavía no hay presupuestos")).toBeVisible();
  await page.getByRole("link", { name: "Nuevo presupuesto" }).click();
  await page.getByRole("button", { name: "Verdulería" }).click();
  await page.getByLabel("Tope mensual · ARS").fill("10000");
  await page.getByRole("button", { name: "Guardar" }).click();

  // Assert
  await expect(page).toHaveURL(/\/budgets$/);
  const row = page.getByRole("link", { name: /Verdulería/ });
  await expect(row.getByText(/^\$\s8\.000 de \$\s10\.000$/)).toBeVisible();
  await expect(row.getByText(/^Cerca del tope · te quedan \$\s2\.000$/)).toBeVisible();
  await expect(row.getByRole("progressbar", { name: "Progreso de Verdulería" })).toHaveAttribute(
    "aria-valuenow",
    "800000",
  );
  await page.goto("/home");
  const near = page.getByRole("region", { name: "Presupuestos cerca del tope" });
  await expect(near.getByText("Verdulería")).toBeVisible();
  await expect(near.getByText(/^Cerca del tope/)).toBeVisible();
});

test("edits the limit and removes the budget", async ({ page }) => {
  // Arrange
  await seedGroceriesSpending(page);
  await page.goto("/budgets/new");
  await page.getByRole("button", { name: "Verdulería" }).click();
  await page.getByLabel("Tope mensual · ARS").fill("10000");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page).toHaveURL(/\/budgets$/);

  // Act
  await page.getByRole("link", { name: /Verdulería/ }).click();
  await page.getByLabel("Tope mensual · ARS").fill("20000");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  // Assert
  const row = page.getByRole("link", { name: /Verdulería/ });
  await expect(row.getByText(/^Te quedan \$\s12\.000$/)).toBeVisible();
  await row.click();
  await page.getByRole("button", { name: "Eliminar presupuesto" }).click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).click();
  await expect(page.getByText("Todavía no hay presupuestos")).toBeVisible();
});
