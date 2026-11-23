import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ context }) => {
  await signInAsNewUser(context);
});

test("creates accounts and shows them in Cuentas and in the balance detail", async ({ page }) => {
  // Arrange
  await page.goto("/accounts");
  await expect(page.getByText("Todavía no hay cuentas")).toBeVisible();

  // Act
  await page.getByRole("link", { name: "Agregar", exact: true }).click();
  await page.getByRole("button", { name: "Galicia" }).click();
  await page.getByLabel("Saldo inicial · ARS").fill("1.500.000");
  await page.getByRole("switch", { name: "Dólares" }).click();
  await page.getByLabel("Saldo inicial · USD").fill("300");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();

  await expect(page).toHaveURL(/\/accounts$/);
  await page.getByRole("link", { name: "Agregar", exact: true }).click();
  await page.getByRole("button", { name: "Persona" }).click();
  await page.getByLabel("Nombre").fill("Juan");
  await page.getByLabel("Saldo inicial · ARS").fill("50000");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();

  // Assert
  await expect(page).toHaveURL(/\/accounts$/);
  const money = page.getByRole("region", { name: "Dinero" });
  await expect(money.getByText("Galicia", { exact: true })).toBeVisible();
  await expect(money.getByText("Banco · ARS y USD")).toBeVisible();
  await expect(money.getByText(/^\$\s1\.500\.000$/)).toBeVisible();
  await expect(money.getByText(/^US\$\s300$/)).toBeVisible();
  const people = page.getByRole("region", { name: "Personas" });
  await expect(people.getByText("Juan", { exact: true })).toBeVisible();
  await expect(people.getByText("Te debe")).toBeVisible();

  await page.goto("/home");
  await page.getByRole("link", { name: /Saldo total/ }).click();
  await expect(page).toHaveURL(/\/balance$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Saldo total");
  const pesos = page.getByRole("region", { name: /^Pesos/ });
  await expect(pesos.getByText("Galicia", { exact: true })).toBeVisible();
  await expect(pesos.getByText("Juan", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: /^Pesos · \$\s1\.550\.000$/ })).toBeVisible();
  const dollars = page.getByRole("region", { name: /^Dólares · US\$\s300$/ });
  await expect(dollars.getByText("Galicia", { exact: true })).toBeVisible();
});

test("deletes an account without movements after confirming", async ({ page }) => {
  // Arrange
  await page.goto("/accounts/new");
  await page.getByRole("button", { name: "Efectivo" }).click();
  await page.getByLabel("Nombre").fill("Caja chica");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(page).toHaveURL(/\/accounts$/);

  // Act
  await page.getByRole("link", { name: /^Caja chica/ }).click();
  await page.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.getByRole("alertdialog", { name: "¿Eliminar Caja chica?" })).toBeVisible();
  await page.getByRole("button", { name: "Confirmar" }).click();

  // Assert
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByText("Caja chica")).toHaveCount(0);
});

test("deactivates an account and keeps it out of the balance", async ({ page }) => {
  // Arrange
  await page.goto("/accounts/new");
  await page.getByRole("button", { name: "Efectivo" }).click();
  await page.getByLabel("Nombre").fill("Caja vieja");
  await page.getByLabel("Saldo inicial · ARS").fill("1000");
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(page).toHaveURL(/\/accounts$/);

  // Act
  await page.getByRole("link", { name: /^Caja vieja/ }).click();
  await page.getByRole("button", { name: "Desactivar" }).click();
  await page.getByRole("button", { name: "Confirmar" }).click();

  // Assert
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(
    page.getByRole("region", { name: "Inactivas" }).getByText("Caja vieja"),
  ).toBeVisible();
  await page.goto("/balance");
  await expect(page.getByText("Caja vieja")).toHaveCount(0);
});

test("shows the institution logo on a bank account and the type icon without one", async ({
  page,
}) => {
  // Arrange
  await page.goto("/accounts/new");
  await page.getByRole("button", { name: "Galicia" }).click();
  await page.getByRole("button", { name: "Guardar cuenta" }).click();
  await expect(page).toHaveURL(/\/accounts$/);

  // Act
  const money = page.getByRole("region", { name: "Dinero" });
  const galicia = money.getByRole("link", { name: /Galicia/ });
  const logo = galicia.locator("img");

  // Assert
  await expect(logo).toHaveAttribute("src", "/institutions/galicia.svg");
  await expect
    .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  const cash = money.getByRole("link", { name: /Efectivo/ });
  await expect(cash.locator("img")).toHaveCount(0);
});
