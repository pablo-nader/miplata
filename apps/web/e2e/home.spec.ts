import { expect, test } from "@playwright/test";

test.describe("home screen", () => {
  test.use({ locale: "es-AR" });

  test("shows the app name and the API status in Spanish", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "miPlata" })).toBeVisible();
    await expect(page.getByRole("status")).toHaveText("Conectado");
    await expect(page.getByText(/^Versión /)).toBeVisible();
  });

  test("shows the unavailable state when the API is down", async ({ page }) => {
    await page.route("**/api/health", (route) => route.fulfill({ status: 503, body: "{}" }));
    await page.goto("/");

    await expect(page.getByRole("status")).toHaveText("Sin conexión con el servidor");
  });
});

test.describe("home screen in English", () => {
  test.use({ locale: "en-US" });

  test("shows the API status in English", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("status")).toHaveText("Connected");
  });
});

test("serves a web app manifest and icons", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  const icon = await request.get("/icons/icon-512.png");

  expect(manifest.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toBe("image/png");
});
