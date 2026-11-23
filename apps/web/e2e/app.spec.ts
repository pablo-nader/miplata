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

test.describe("language", () => {
  test.use({ locale: "es-AR" });

  test("shows the home band in Spanish and sets the document language", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    const heading = page.getByRole("heading", { level: 1 });

    // Assert
    await expect(heading).toHaveText("miPlata");
    await expect(page.getByRole("link", { name: "Menú" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
  });
});

test.describe("language in English", () => {
  test.use({ locale: "en-US" });

  test("shows the home band in English and sets the document language", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    const menu = page.getByRole("link", { name: "Menu" });

    // Assert
    await expect(menu).toBeVisible();
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
