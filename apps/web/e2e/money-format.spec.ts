import type { BrowserContext } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ viewport: { width: 390, height: 844 } });

async function seed(context: BrowserContext, locale: "es" | "en") {
  await signInAsNewUser(context, { locale });
  const group = await context.request.post("http://localhost:4173/api/category-groups", {
    data: { name: "Food" },
  });
  await context.request.post("http://localhost:4173/api/categories", {
    data: {
      type: "expense",
      groupId: ((await group.json()) as { id: string }).id,
      name: "Groceries",
      icon: null,
      color: 1,
    },
  });
  await context.request.post("http://localhost:4173/api/accounts", {
    data: {
      type: "cash",
      name: "Wallet",
      currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    },
  });
}

test.describe("Spanish", () => {
  test.use({ locale: "es-AR" });

  test("types 1234,56, groups it live and shows it with Spanish separators", async ({
    page,
    context,
  }) => {
    // Arrange
    await seed(context, "es");
    await page.goto("/home");
    await page.getByRole("link", { name: "Nuevo movimiento" }).first().click();

    // Act
    const amount = page.getByLabel("Monto", { exact: true });
    await amount.click();
    await amount.pressSequentially("1234,56");

    // Assert
    await expect(amount).toHaveValue("1.234,56");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await page.getByRole("option", { name: "Groceries" }).click();
    await page.getByRole("button", { name: "Guardar gasto" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("link", { name: /Groceries/ })).toContainText(/\$\s1\.234,56/);
  });
});

test.describe("English", () => {
  test.use({ locale: "en-US" });

  test("types 1234.56, groups it live and shows it with English separators", async ({
    page,
    context,
  }) => {
    // Arrange
    await seed(context, "en");
    await page.goto("/home");
    await page.getByRole("link", { name: "New movement" }).first().click();

    // Act
    const amount = page.getByLabel("Amount", { exact: true });
    await amount.click();
    await amount.pressSequentially("1234.56");

    // Assert
    await expect(amount).toHaveValue("1,234.56");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByRole("option", { name: "Groceries" }).click();
    await page.getByRole("button", { name: "Save expense" }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("link", { name: /Groceries/ })).toContainText(/\$\s1,234\.56/);
  });
});
