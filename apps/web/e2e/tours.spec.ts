import { expect, type Page, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ context }) => {
  await signInAsNewUser(context, { freshTours: true });
});

const popover = (page: Page) => page.locator(".driver-popover");

async function goToStep(page: Page, target: number) {
  for (let step = 1; step < target; step += 1) {
    await popover(page).getByRole("button", { name: "Siguiente" }).click();
    await expect(popover(page).getByText(new RegExp(`^Paso ${step + 1} de \\d$`))).toBeVisible();
  }
}

async function stepCount(page: Page) {
  const text = await popover(page)
    .getByText(/^Paso 1 de \d$/)
    .innerText();
  return Number(text.replace("Paso 1 de ", ""));
}

async function seenTours(page: Page) {
  return page.evaluate(() =>
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith("miplata.tour."))
      .map((key) => key.split(".")[3]),
  );
}

test("shows the guide the first time a screen is opened", async ({ page }) => {
  // Arrange
  await page.goto("/budgets");

  // Act
  const guide = popover(page);

  // Assert
  await expect(guide).toBeVisible();
  await expect(guide.getByText("Presupuestos").first()).toBeVisible();
  await expect(guide.getByText(/^Paso 1 de \d$/)).toBeVisible();
  await expect(page.getByRole("dialog")).toBeVisible();
});

test("can be closed at any step and does not come back", async ({ page }) => {
  // Arrange
  await page.goto("/budgets");
  await expect(popover(page)).toBeVisible();
  await popover(page).getByRole("button", { name: "Siguiente" }).click();

  // Act
  await popover(page).getByRole("button", { name: "Cerrar guía" }).click();

  // Assert
  await expect(popover(page)).toBeHidden();
  expect(await seenTours(page)).toContain("budgets");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Presupuestos", level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(popover(page)).toBeHidden();
});

test("finishes step by step and does not show again on a later visit", async ({ page }) => {
  // Arrange
  await page.goto("/budgets");
  await expect(popover(page)).toBeVisible();

  // Act
  await goToStep(page, await stepCount(page));
  await popover(page).getByRole("button", { name: "Listo" }).click();
  await page.goto("/menu");
  await page.goto("/budgets");

  // Assert
  await expect(page.getByRole("heading", { name: "Presupuestos", level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(popover(page)).toBeHidden();
  expect(await seenTours(page)).toContain("budgets");
});

test("closes with Escape and moves between steps with the arrow keys", async ({ page }) => {
  // Arrange
  await page.goto("/budgets");
  await expect(popover(page)).toBeVisible();

  // Act
  await expect(async () => {
    await page.keyboard.press("ArrowRight");
    await expect(popover(page).getByText(/^Paso 2 de \d$/)).toBeVisible({ timeout: 500 });
  }).toPass();
  await expect(async () => {
    await page.keyboard.press("ArrowLeft");
    await expect(popover(page).getByText(/^Paso 1 de \d$/)).toBeVisible({ timeout: 500 });
  }).toPass();
  await page.keyboard.press("Escape");

  // Assert
  await expect(popover(page)).toBeHidden();
  expect(await seenTours(page)).toContain("budgets");
});

test("keeps the explanation card off the highlighted element", async ({ page }) => {
  // Arrange
  await page.goto("/budgets");
  await expect(popover(page)).toBeVisible();

  // Act
  await goToStep(page, 2);
  const active = page.locator(".driver-active-element");
  await expect(active).toBeVisible();
  const card = await popover(page).boundingBox();
  const target = await active.boundingBox();

  // Assert
  expect(card).not.toBeNull();
  expect(target).not.toBeNull();
  if (card && target) {
    const apart =
      card.y + card.height <= target.y ||
      target.y + target.height <= card.y ||
      card.x + card.width <= target.x ||
      target.x + target.width <= card.x;
    expect(apart).toBe(true);
  }
});

test("replays any guide from the menu and can reset them all", async ({ page }) => {
  // Arrange
  await page.goto("/budgets");
  await popover(page).getByRole("button", { name: "Cerrar guía" }).click();
  await page.goto("/menu");

  // Act
  await page.getByRole("link", { name: "Ver guías" }).click();
  await page.getByRole("link", { name: "Ver la guía de Presupuestos" }).click();

  // Assert
  await expect(page).toHaveURL(/\/budgets$/);
  await expect(popover(page).getByText("Presupuestos").first()).toBeVisible();
  await popover(page).getByRole("button", { name: "Cerrar guía" }).click();
  await page.goto("/guides");
  await page.getByRole("button", { name: "Mostrar todas de nuevo" }).click();
  await expect(page.getByRole("status")).toContainText("Listo.");
  expect(await seenTours(page)).toEqual([]);
  await page.goto("/accounts");
  await expect(popover(page).getByText("Tus cuentas")).toBeVisible();
});

test("highlights the new movement button in the sidebar on a wide screen", async ({ page }) => {
  // Arrange
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/home");
  await expect(popover(page)).toBeVisible();

  // Act
  await goToStep(page, 4);
  const title = popover(page).getByText("Anotar un movimiento");

  // Assert
  await expect(title).toBeVisible();
  const target = await page.locator(".driver-active-element").boundingBox();
  const sidebar = await page.locator(".sidebar").boundingBox();
  expect(target).not.toBeNull();
  expect(sidebar).not.toBeNull();
  if (target && sidebar) {
    expect(target.x).toBeGreaterThanOrEqual(sidebar.x - 1);
    expect(target.x + target.width).toBeLessThanOrEqual(sidebar.x + sidebar.width + 1);
  }
});

test("shows a guide again when the browser storage is empty", async ({ page }) => {
  // Arrange
  await page.goto("/budgets");
  await popover(page).getByRole("button", { name: "Cerrar guía" }).click();
  await page.evaluate(() => window.localStorage.clear());

  // Act
  await page.reload();

  // Assert
  await expect(popover(page)).toBeVisible();
});

test.describe("dark theme with reduced motion", () => {
  test.use({ colorScheme: "dark", reducedMotion: "reduce" });

  test("paints the card and the overlay with theme tokens", async ({ page }) => {
    // Arrange
    await page.goto("/budgets");
    await expect(popover(page)).toBeVisible();

    // Act
    const colors = await page.evaluate(() => {
      const read = (value: string) => {
        const probe = document.createElement("span");
        probe.style.color = value;
        document.body.append(probe);
        const resolved = getComputedStyle(probe).color;
        probe.remove();
        return resolved;
      };
      const card = document.querySelector(".driver-popover");
      const overlay = document.querySelector(".driver-overlay path");
      return {
        card: card ? getComputedStyle(card).backgroundColor : null,
        surface: read("var(--color-surface)"),
        overlay: overlay ? getComputedStyle(overlay).fill : null,
        band: read("var(--color-band)"),
      };
    });

    // Assert
    expect(colors.card).toBe(colors.surface);
    expect(colors.overlay).toBe(colors.band);
  });
});
