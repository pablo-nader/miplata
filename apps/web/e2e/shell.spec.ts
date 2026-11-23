import { expect, type Page, test } from "@playwright/test";
import { mockSignedIn } from "./session";

test.beforeEach(async ({ page }) => {
  await mockSignedIn(page);
});

const viewports = {
  phone: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1280, height: 800 },
} as const;

const schemes = ["light", "dark"] as const;

const mainPaths = ["/home", "/movements", "/accounts", "/reports"];
const focusedPaths = [
  "/balance",
  "/movements/new",
  "/accounts/1/statement",
  "/accounts/1/statement/pay",
  "/to-pay",
  "/menu",
];

async function hasHorizontalScroll(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
}

for (const [device, viewport] of Object.entries(viewports)) {
  for (const scheme of schemes) {
    test.describe(`${device} in ${scheme} theme`, () => {
      test.use({ viewport, colorScheme: scheme, locale: "es-AR" });

      for (const path of [...mainPaths, ...focusedPaths]) {
        test(`${path} has no horizontal scroll`, async ({ page }) => {
          // Arrange
          await page.goto(path);

          // Act
          const overflow = await hasHorizontalScroll(page);

          // Assert
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          expect(overflow).toBe(false);
        });
      }

      test("shows the right navigation for the width", async ({ page }) => {
        // Arrange
        await page.goto("/movements");

        // Act
        const navigation = page.getByRole("navigation", { name: "Navegación principal" });
        const box = await navigation.boundingBox();

        // Assert
        await expect(navigation).toHaveCount(1);
        await expect(navigation.getByRole("link")).toHaveCount(device === "phone" ? 5 : 6);
        await expect(navigation.getByRole("link", { name: "Nuevo movimiento" })).toBeVisible();
        if (device === "phone") {
          expect(box?.y ?? 0).toBeGreaterThan(viewport.height / 2);
        } else {
          expect(box?.x).toBe(0);
          expect(box?.width ?? viewport.width).toBeLessThan(viewport.width / 2);
        }
      });

      test("marks the current section and navigates", async ({ page }) => {
        // Arrange
        await page.goto("/home");
        const navigation = page.getByRole("navigation", { name: "Navegación principal" });

        // Act
        await navigation.getByRole("link", { name: "Cuentas" }).click();

        // Assert
        await expect(page).toHaveURL(/\/accounts$/);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cuentas");
        await expect(navigation.locator("[aria-current=page]")).toHaveText("Cuentas");
      });

      test("opens the menu from the home band", async ({ page }) => {
        // Arrange
        await page.goto("/home");

        // Act
        await page.locator(".signage-band").getByRole("link", { name: "Menú" }).click();

        // Assert
        await expect(page).toHaveURL(/\/menu$/);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Menú");
      });
    });
  }
}

test.describe("keyboard focus", () => {
  test.use({ viewport: viewports.phone, colorScheme: "light" });

  test("shows a visible focus ring in the ink color", async ({ page }) => {
    // Arrange
    await page.goto("/balance");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Act
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const style = getComputedStyle(document.activeElement as Element);
      return { width: style.outlineWidth, style: style.outlineStyle, color: style.outlineColor };
    });

    // Assert
    expect(outline.width).toBe("2px");
    expect(outline.style).toBe("solid");
    expect(outline.color).toBe("rgb(28, 31, 34)");
  });
});

test.describe("keyboard focus on the signage band", () => {
  test.use({ viewport: viewports.phone, colorScheme: "light" });

  test("uses a ring color that differs from the band", async ({ page }) => {
    // Arrange
    await page.goto("/home");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Act
    await page.keyboard.press("Tab");
    const colors = await page.evaluate(() => {
      const focused = document.activeElement as Element;
      const band = focused.closest(".signage-band") as Element;
      return {
        ring: getComputedStyle(focused).outlineColor,
        band: getComputedStyle(band).backgroundColor,
      };
    });

    // Assert
    expect(colors.ring).not.toBe(colors.band);
    expect(colors.ring).toBe("rgb(255, 255, 255)");
  });
});

test.describe("reduced motion", () => {
  test.use({ viewport: viewports.phone });

  test("removes the press transition", async ({ page }) => {
    // Arrange
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");

    // Act
    const duration = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--motion-press").trim(),
    );

    // Assert
    expect(duration).toBe("0s");
  });
});
