import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

async function pickCategory(page: Page, name: string) {
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("option", { name }).click();
}

test.beforeEach(async ({ context }) => {
  await signInAsNewUser(context);
  const group = await context.request.post("http://localhost:4173/api/category-groups", {
    data: { name: "Vivienda" },
  });
  await context.request.post("http://localhost:4173/api/categories", {
    data: {
      type: "expense",
      groupId: ((await group.json()) as { id: string }).id,
      name: "Alquiler",
      icon: null,
      color: 1,
    },
  });
  await context.request.post("http://localhost:4173/api/accounts", {
    data: {
      type: "cash",
      name: "Billetera",
      currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    },
  });
});

test("creates a recurring expense, confirms it from to-pay and finds it in movements", async ({
  page,
}) => {
  // Arrange
  await page.goto("/menu");
  await page.getByRole("link", { name: "Gastos fijos" }).click();
  await expect(page).toHaveURL(/\/recurring$/);
  await expect(page.getByText("Todavía no tenés gastos fijos")).toBeVisible();

  // Act
  await page.getByRole("link", { name: "Agregar" }).first().click();
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Billetera" });
  await page.getByLabel("Monto", { exact: true }).fill("575.000");
  await pickCategory(page, "Alquiler");
  await page.getByLabel("Descripción").fill("Alquiler del depto");
  await page.getByRole("button", { name: "Guardar gasto fijo" }).click();
  await expect(page).toHaveURL(/\/recurring$/);
  const definition = page.getByRole("link", { name: /Alquiler del depto/ });
  await expect(definition).toContainText("Mensual");
  await expect(definition).toContainText(/\$\s575\.000/);
  await expect(definition).toContainText("Activo");

  await page.goto("/menu");
  await page.getByRole("link", { name: "Por pagar" }).click();
  await expect(page).toHaveURL(/\/to-pay$/);
  const due = page.getByRole("region", { name: "Vencidos y hoy" });
  await expect(due.getByText("Alquiler del depto")).toBeVisible();
  await due.getByRole("button", { name: "Confirmar Alquiler del depto" }).click();

  // Assert
  await expect(due).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Próximos" })).toContainText("Alquiler del depto");
  await page.goto("/movements");
  const movement = page.getByRole("link", { name: /Alquiler del depto/ });
  await expect(movement).toContainText("Billetera");
  await expect(movement).toContainText(/\$\s575\.000/);
});

test("adjusts a variable recurring expense before confirming it", async ({ page }) => {
  // Arrange
  await page.goto("/recurring/new");
  await page.getByLabel("Cuenta", { exact: true }).selectOption({ label: "Billetera" });
  await page.getByRole("radio", { name: "Variable" }).check({ force: true });
  await pickCategory(page, "Alquiler");
  await page.getByLabel("Descripción").fill("Luz");
  await page.getByRole("button", { name: "Guardar gasto fijo" }).click();
  await expect(page).toHaveURL(/\/recurring$/);
  await page.goto("/to-pay");

  // Act
  const due = page.getByRole("region", { name: "Vencidos y hoy" });
  await due.getByRole("button", { name: "Ajustar Luz" }).click();
  const panel = page.getByRole("region", { name: "Ajustar Luz" });
  await panel.getByLabel("Monto").fill("41.500");
  await panel.getByRole("button", { name: "Confirmar" }).click();

  // Assert
  await expect(due).toHaveCount(0);
  await page.goto("/movements");
  await expect(page.getByRole("link", { name: /Luz/ })).toContainText(/\$\s41\.500/);
});
