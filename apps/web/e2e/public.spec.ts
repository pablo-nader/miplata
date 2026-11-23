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

const languages = [
  { locale: "es-AR", lang: "es", privacy: "Política de privacidad", terms: "Términos de uso" },
  { locale: "en-US", lang: "en", privacy: "Privacy policy", terms: "Terms of use" },
] as const;

const schemes = ["light", "dark"] as const;

const viewports = {
  phone: { width: 390, height: 844 },
  desktop: { width: 1280, height: 800 },
} as const;

for (const language of languages) {
  for (const scheme of schemes) {
    for (const [device, viewport] of Object.entries(viewports)) {
      test.describe(`${language.lang} ${scheme} ${device}`, () => {
        test.use({ locale: language.locale, colorScheme: scheme, viewport });

        const pages = [
          { path: "/", heading: "miPlata" },
          { path: "/privacy", heading: language.privacy },
          { path: "/terms", heading: language.terms },
        ];

        for (const { path, heading } of pages) {
          test(`${path} loads without a session`, async ({ page }) => {
            // Arrange
            const response = await page.goto(path);

            // Act
            const overflow = await page.evaluate(
              () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
            );
            const surface = await page.evaluate(
              () => getComputedStyle(document.body).backgroundColor,
            );

            // Assert
            expect(response?.status()).toBe(200);
            await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
            await expect(page.locator("html")).toHaveAttribute("lang", language.lang);
            await expect(page.getByRole("contentinfo").getByRole("link")).toHaveCount(2);
            expect(overflow).toBe(false);
            expect(surface).toBe(toRgb(tokens.theme[scheme].surface?.$value ?? ""));
          });
        }
      });
    }
  }
}

test.describe("public navigation", () => {
  test.use({ locale: "es-AR", viewport: viewports.phone });

  test("the footer opens the privacy policy and the language can be switched", async ({ page }) => {
    // Arrange
    await page.goto("/");

    // Act
    await page.getByRole("contentinfo").getByRole("link", { name: "Privacidad" }).click();
    await page.getByRole("button", { name: "English" }).click();

    // Assert
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("link", { name: "hm.pablito@gmail.com" })).toBeVisible();
  });
});
