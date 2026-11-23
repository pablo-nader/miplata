import { type BrowserContext, expect, test } from "@playwright/test";
import { signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

type CategoriesBody = { expenseGroups: { categories: unknown[] }[]; income: unknown[] };

const origin = "http://localhost:4173";

function isoDay(offsetDays: number): { iso: string; day: number } {
  const date = new Date(Date.now() + offsetDays * 86_400_000);
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { iso, day: date.getDate() };
}

async function seedRecurring(context: BrowserContext) {
  const account = (await (
    await context.request.post(`${origin}/api/accounts`, {
      data: {
        type: "cash",
        name: "Billetera",
        currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
      },
    })
  ).json()) as { id: string };
  const group = (await (
    await context.request.post(`${origin}/api/category-groups`, { data: { name: "Vivienda" } })
  ).json()) as { id: string };
  const category = (await (
    await context.request.post(`${origin}/api/categories`, {
      data: { type: "expense", groupId: group.id, name: "Alquiler", icon: null, color: 1 },
    })
  ).json()) as { id: string };
  const today = isoDay(0);
  const tomorrow = isoDay(1);
  for (const [startsOn, day, description] of [
    [today.iso, today.day, "Alquiler hoy"],
    [tomorrow.iso, tomorrow.day, "Expensa mañana"],
  ] as const) {
    await context.request.post(`${origin}/api/recurring`, {
      data: {
        type: "expense",
        frequency: "monthly",
        dayOfMonth: day,
        amountMode: "fixed",
        amountMinor: 100_000,
        currency: "ARS",
        accountId: account.id,
        categoryId: category.id,
        description,
        startsOn,
        endsOn: null,
      },
    });
  }
}

test("shows the menu counters from the data behind each section", async ({ context, page }) => {
  // Arrange
  await signInAsNewUser(context);
  await seedRecurring(context);
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const categories = (await (
    await context.request.get(`${origin}/api/categories`)
  ).json()) as CategoriesBody;
  const recurring = (await (await context.request.get(`${origin}/api/recurring`)).json()) as {
    items: unknown[];
  };
  const toPay = (await (
    await context.request.get(`${origin}/api/recurring/occurrences?type=expense`)
  ).json()) as { items: { dueOn: string }[]; today: string };
  const toPayCount = toPay.items.filter((item) => item.dueOn <= toPay.today).length;
  const budgets = (await (
    await context.request.get(`${origin}/api/budgets?month=${month}`)
  ).json()) as { items: unknown[] };
  const categoryCount =
    categories.expenseGroups.reduce((total, group) => total + group.categories.length, 0) +
    categories.income.length;

  // Act
  await page.goto("/menu");

  // Assert
  const counter = (label: string) =>
    page.getByRole("link", { name: new RegExp(label) }).locator(".menu-screen__count");
  await expect(counter("Por pagar")).toHaveText(String(toPayCount));
  await expect(counter("Gastos fijos")).toHaveText(String(recurring.items.length));
  await expect(counter("Categorías")).toHaveText(String(categoryCount));
  await expect(counter("Presupuestos")).toHaveText(String(budgets.items.length));
});

test("opens the language choice from the menu and changes the language", async ({
  context,
  page,
}) => {
  // Arrange
  await signInAsNewUser(context);
  await page.goto("/menu");

  // Act
  await page.getByRole("link", { name: /Idioma/ }).click();
  await expect(page).toHaveURL(/\/menu\/language$/);
  await page.getByRole("button", { name: "English" }).click();

  // Assert
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Language");
  await expect(page.getByRole("button", { name: "English" })).toHaveAttribute(
    "aria-current",
    "true",
  );
});
