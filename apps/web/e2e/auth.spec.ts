import { expect, test } from "@playwright/test";
import { mockSignedIn } from "./session";

const protectedPaths = [
  "/movements",
  "/movements/new",
  "/accounts",
  "/accounts/1/statement",
  "/reports",
  "/balance",
  "/to-pay",
  "/menu",
];

test.describe("signed out", () => {
  test.use({ locale: "es-AR" });

  for (const path of protectedPaths) {
    test(`${path} redirects to the root`, async ({ page }) => {
      // Arrange
      const target = path;

      // Act
      await page.goto(target);

      // Assert
      await expect(page).toHaveURL(/\/$/);
      await expect(page.getByRole("button", { name: "Entrar con Google" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toHaveCount(0);
    });
  }
});

test.describe("signed in", () => {
  test.use({ locale: "es-AR" });

  test("moves a signed-in visitor from the landing page to the home screen", async ({ page }) => {
    // Arrange
    await mockSignedIn(page);

    // Act
    await page.goto("/");

    // Assert
    await expect(page).toHaveURL(/\/home$/);
  });

  test("keeps the protected route and offers sign out in the menu", async ({ page }) => {
    // Arrange
    await mockSignedIn(page);

    // Act
    await page.goto("/menu");

    // Assert
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    await expect(page.getByText("ana@example.com")).toBeVisible();
  });
});
