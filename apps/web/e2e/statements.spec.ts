import { expect, test } from "@playwright/test";
import { seedFinancialCharges, signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

test("opens a card statement, adds a charge and pays it", async ({ context, page }) => {
  // Arrange
  const userId = await signInAsNewUser(context);
  await seedFinancialCharges(userId);
  const api = context.request;
  const group = await api.post("http://localhost:4173/api/category-groups", {
    data: { name: "Comida" },
  });
  const food = await api.post("http://localhost:4173/api/categories", {
    data: {
      type: "expense",
      groupId: ((await group.json()) as { id: string }).id,
      name: "Supermercado",
      icon: null,
      color: 1,
    },
  });
  const pesos = [{ currency: "ARS", openingBalanceMinor: 0 }];
  await api.post("http://localhost:4173/api/accounts", {
    data: { type: "bank", name: "Galicia", currencies: pesos },
  });
  const card = await api.post("http://localhost:4173/api/accounts", {
    data: {
      type: "credit_card",
      name: "Visa Galicia",
      closingDay: 27,
      dueDay: 5,
      currencies: pesos,
    },
  });
  await api.post("http://localhost:4173/api/movements", {
    data: {
      type: "expense",
      occurredOn: today(),
      categoryId: ((await food.json()) as { id: string }).id,
      accountId: ((await card.json()) as { id: string }).id,
      currency: "ARS",
      amountMinor: 100_000_00,
    },
  });

  // Act
  await page.goto("/accounts");
  await page.getByRole("link", { name: /^Visa Galicia/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Visa Galicia" })).toBeVisible();
  await expect(page.getByText(/^\$\s100\.000$/).first()).toBeVisible();

  await page.getByRole("link", { name: "Agregar cargo" }).click();
  await page.getByLabel("Categoría").selectOption({ label: "Intereses" });
  await page.getByLabel("Monto").fill("5000");
  await page.getByRole("button", { name: "Guardar cargo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Visa Galicia" })).toBeVisible();
  await expect(page.getByText(/^\$\s105\.000$/).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Cargos" })).toBeVisible();

  await page.getByRole("link", { name: "Pagar resumen" }).click();
  await page.getByRole("button", { name: /^Pagar \$\s105\.000$/ }).click();

  // Assert
  await expect(page.getByRole("heading", { level: 1, name: "Visa Galicia" })).toBeVisible();
  await expect(page.getByText("Pagos")).toBeVisible();
  await expect(page.getByText(/^\$\s0$/).first()).toBeVisible();
  await expect(page.getByText(/^\$\s105\.000$/).first()).toBeVisible();
});
