import { expect, test } from "@playwright/test";

test.describe("home screen", () => {
  test.use({ locale: "es-AR" });

  test("shows the app name and the API status in Spanish", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    const status = page.getByRole("status");

    // Assert
    await expect(page.getByRole("heading", { name: "miPlata" })).toBeVisible();
    await expect(status).toHaveText("Conectado");
    await expect(page.getByText(/^Versión /)).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });

  test("shows the unavailable state when the API is down", async ({ page }) => {
    // Arrange
    await page.route("**/api/health", (route) => route.fulfill({ status: 503, body: "{}" }));

    // Act
    await page.goto("/");

    // Assert
    await expect(page.getByRole("status")).toHaveText("Sin conexión con el servidor");
  });
});

test.describe("home screen in English", () => {
  test.use({ locale: "en-US" });

  test("shows the API status in English and sets the document language", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    const status = page.getByRole("status");

    // Assert
    await expect(status).toHaveText("Connected");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});

test.describe("themes", () => {
  test("uses the light surface token by default", async ({ page }) => {
    // Arrange
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    // Act
    const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Assert
    expect(surface).toBe("rgb(255, 255, 255)");
  });

  test("uses the dark surface token when the device prefers dark", async ({ page }) => {
    // Arrange
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    // Act
    const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Assert
    expect(surface).toBe("rgb(17, 19, 21)");
  });
});

test("serves a web app manifest and icons", async ({ request }) => {
  // Arrange
  const manifestUrl = "/manifest.webmanifest";

  // Act
  const manifest = await request.get(manifestUrl);
  const icon = await request.get("/icons/icon-512.png");

  // Assert
  expect(manifest.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toBe("image/png");
});
