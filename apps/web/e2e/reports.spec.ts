import { expect, type Page, test } from "@playwright/test";
import { createFakeCategoriesBackend } from "../src/test/fake-categories-backend";
import { mockSignedIn } from "./session";

async function mockReportsApi(page: Page) {
  const backend = createFakeCategoriesBackend();
  const catalog = backend.handle("GET", "/api/categories").body;
  const rent = backend.categories.find((item) => item.nameKey === "defaults.category.rent");
  const housing = backend.groups[0];
  const json = (body: unknown) => ({ contentType: "application/json", body: JSON.stringify(body) });

  await page.route("**/api/categories", (route) => route.fulfill(json(catalog)));
  await page.route("**/api/accounts", (route) => route.fulfill(json([])));
  await page.route("**/api/people", (route) => route.fulfill(json([])));
  await page.route("**/api/reports/spending?**", (route) =>
    route.fulfill(
      json({
        month: "2026-11",
        currency: "ARS",
        totalMinor: 100_000_00,
        groups: [
          {
            groupId: housing?.id,
            totalMinor: 100_000_00,
            sharePercent: 100,
            categories: [{ categoryId: rent?.id, totalMinor: 100_000_00, sharePercent: 100 }],
          },
        ],
      }),
    ),
  );
  await page.route("**/api/reports/monthly?**", (route) =>
    route.fulfill(
      json({
        currency: "ARS",
        months: Array.from({ length: 12 }, (_, index) => ({
          month: `2026-${String(index + 1).padStart(2, "0")}`,
          inMinor: 200_000_00,
          outMinor: 150_000_00,
          resultMinor: 50_000_00,
        })),
      }),
    ),
  );
  await page.route("**/api/reports/changes?**", (route) =>
    route.fulfill(
      json({
        month: "2026-11",
        currency: "ARS",
        categories: [
          {
            categoryId: rent?.id,
            currentMinor: 125_000_00,
            previousAverageMinor: 100_000_00,
            percentChange: 25,
          },
        ],
      }),
    ),
  );
  await page.route("**/api/reports/committed?**", (route) =>
    route.fulfill(
      json({
        currency: "ARS",
        months: [
          {
            month: "2026-12",
            installmentsMinor: 30_000_00,
            recurringMinor: 0,
            totalMinor: 30_000_00,
          },
        ],
      }),
    ),
  );
}

test.describe("reports", () => {
  test.use({ locale: "es-AR" });

  test("opens each report tab", async ({ page }) => {
    // Arrange
    await mockSignedIn(page);
    await mockReportsApi(page);
    await page.goto("/reports");

    // Act
    await expect(page.getByRole("button", { name: /Vivienda/ })).toBeVisible();
    await page.getByRole("tab", { name: "Mes a mes" }).click();
    const chart = page.getByRole("img", { name: /Gráfico de barras/ });
    await expect(chart).toBeVisible();
    await page.getByRole("tab", { name: "Qué cambió" }).click();
    await expect(page.getByText("+25,0 % vs. el promedio")).toBeVisible();
    await page.getByRole("tab", { name: "Comprometido" }).click();

    // Assert
    await expect(page.getByText("Cuotas $ 30.000")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Comprometido" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("works in the dark theme on a phone", async ({ page }) => {
    // Arrange
    await page.emulateMedia({ colorScheme: "dark" });
    await page.setViewportSize({ width: 390, height: 844 });
    await mockSignedIn(page);
    await mockReportsApi(page);

    // Act
    await page.goto("/reports");

    // Assert
    await expect(page.getByRole("button", { name: /Vivienda/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
