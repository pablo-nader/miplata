import type { BrowserContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

const pesos = [{ currency: "ARS", openingBalanceMinor: 0 }];

async function post(context: BrowserContext, path: string, data: unknown) {
  const response = await context.request.post(path, { data });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()) as { id: string };
}

async function pickCategory(page: Page, name: string) {
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.getByRole("option", { name }).click();
}

test.beforeEach(async ({ context }) => {
  await signInAsNewUser(context);
  const group = await post(context, "/api/category-groups", { name: "Comida" });
  await post(context, "/api/categories", {
    type: "expense",
    groupId: group.id,
    name: "Supermercado",
    icon: null,
    color: 1,
  });
  await post(context, "/api/accounts", { type: "cash", name: "Billetera", currencies: pesos });
  await post(context, "/api/people", { name: "Juan", currencies: pesos });
});

async function lendTenThousand(page: Page) {
  await page.goto("/movements/new");
  await page.locator("label", { hasText: "Transferencia" }).click();
  await page.getByLabel("Cuenta de origen").selectOption({ label: "Billetera" });
  await page.getByLabel("Cuenta de destino").selectOption({ label: "Juan" });
  await page.getByLabel("Monto que sale").fill("10.000");
  await page.getByLabel("Monto que entra").fill("10.000");
  await page.getByRole("button", { name: "Guardar transferencia" }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test("lends money, sees the person under Te deben and registers the repayment", async ({
  page,
}) => {
  // Arrange
  await lendTenThousand(page);

  // Act
  await page.goto("/loans");
  const owesYou = page.getByRole("region", { name: "Te deben" });
  await expect(owesYou.getByText("Juan", { exact: true })).toBeVisible();
  await expect(owesYou.getByText(/^\+\s\$\s10\.000$/)).toBeVisible();
  await expect(page.getByText("No le debés plata a nadie.")).toBeVisible();
  await owesYou.getByRole("link", { name: /Juan/ }).click();
  await expect(page).toHaveURL(/\/loans\/[0-9a-f-]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Juan");
  await page.getByRole("link", { name: "Registrar devolución" }).click();

  // Assert
  await expect(page).toHaveURL(/\/movements\/new\?type=transfer/);
  await expect(page.getByLabel("Cuenta de origen")).toHaveValue(/.+/);
  await expect(page.getByLabel("Monto que sale")).toHaveValue(/^10\.?000$/);
  await page.getByLabel("Cuenta de destino").selectOption({ label: "Billetera" });
  await page.getByRole("button", { name: "Guardar transferencia" }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto("/loans");
  await expect(page.getByText("Nadie te debe plata por ahora.")).toBeVisible();
  await expect(page.getByText("Juan", { exact: true })).toHaveCount(0);
});

test("forgives a debt as an expense and settles the balance", async ({ page }) => {
  // Arrange
  await lendTenThousand(page);
  await page.goto("/loans");
  await page.getByRole("link", { name: /Juan/ }).click();

  // Act
  await page.getByRole("button", { name: "Perdonar deuda" }).click();
  const dialog = page.getByRole("alertdialog", { name: "¿Perdonar la deuda de Juan?" });
  await expect(dialog).toContainText(/Juan te debe \$\s10\.000/);
  await expect(dialog.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  await pickCategory(page, "Supermercado");
  await dialog.getByRole("button", { name: "Confirmar" }).click();

  // Assert
  await expect(page.getByText("No hay deudas pendientes con esta persona.")).toBeVisible();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "Movimientos" }).getByText("Deuda perdonada · Juan"),
  ).toBeVisible();
  await page.goto("/loans");
  await expect(page.getByText("Nadie te debe plata por ahora.")).toBeVisible();
});

test("opens Préstamos from the menu", async ({ page }) => {
  // Arrange
  await page.goto("/menu");

  // Act
  await page.getByRole("link", { name: "Préstamos" }).click();

  // Assert
  await expect(page).toHaveURL(/\/loans$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Préstamos");
});
