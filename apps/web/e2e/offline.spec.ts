import { expect, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

test("shows a calm offline banner and disables saving until the connection returns", async ({
  context,
  page,
}) => {
  // Arrange
  await signInAsNewUser(context);
  await page.goto("/movements/new");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const save = page.locator('form button[type="submit"]');
  const banner = page.getByRole("status").filter({ hasText: "No se pueden cargar ni guardar" });

  // Act
  await context.setOffline(true);

  // Assert
  await expect(banner).toBeVisible();
  await expect(save).toBeDisabled();
  await expect(
    page.getByRole("status").filter({ hasText: "guardar no está disponible" }),
  ).toBeVisible();

  // Act
  await context.setOffline(false);

  // Assert
  await expect(banner).toHaveCount(0);
  await expect(save).toBeEnabled();
});
