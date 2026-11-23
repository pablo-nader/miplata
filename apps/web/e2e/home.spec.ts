import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

type Tokens = { theme: Record<"light" | "dark", Record<string, { $value: string }>> };

const tokens: Tokens = JSON.parse(
  readFileSync(join(import.meta.dirname, "../../../design/tokens.json"), "utf8"),
);

function toRgb(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
}

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
    expect(surface).toBe(toRgb(tokens.theme.light.surface?.$value ?? ""));
  });

  test("uses the dark surface token when the device prefers dark", async ({ page }) => {
    // Arrange
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");

    // Act
    const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    // Assert
    expect(surface).toBe(toRgb(tokens.theme.dark.surface?.$value ?? ""));
  });
});

test("serves a web app manifest whose icons are all served", async ({ request }) => {
  // Arrange
  const response = await request.get("/manifest.webmanifest");
  const manifest = await response.json();

  // Act
  const icons: { src: string }[] = manifest.icons;
  const statuses = await Promise.all(
    icons.map(async (icon) => (await request.get(icon.src)).status()),
  );

  // Assert
  expect(manifest.name).toBe("miPlata");
  expect(manifest.theme_color).toBe(tokens.theme.light.band?.$value);
  expect(icons).toHaveLength(3);
  expect(statuses).toEqual([200, 200, 200]);
});
