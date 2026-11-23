import { type APIRequestContext, type BrowserContext, expect, test } from "@playwright/test";
import { seedFinancialCharges, signInAsNewUser } from "./real-session";

test.use({ locale: "es-AR", viewport: { width: 390, height: 844 } });

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

test("opens a card statement, adds a charge and pays it", async ({ context, page }) => {
  // Arrange
  const userId = await signInAsNewUser(context);
  await seedFinancialCharges(userId);
  const api = context.request;
  const group = await api.post("http://localhost:4173/api/category-groups", {
    data: { name: "Comida" },
  });
  const food = await api.post("http://localhost:4173/api/categories", {
    data: {
      type: "expense",
      groupId: ((await group.json()) as { id: string }).id,
      name: "Supermercado",
      icon: null,
      color: 1,
    },
  });
  const pesos = [{ currency: "ARS", openingBalanceMinor: 0 }];
  await api.post("http://localhost:4173/api/accounts", {
    data: { type: "bank", name: "Galicia", currencies: pesos },
  });
  const card = await api.post("http://localhost:4173/api/accounts", {
    data: {
      type: "credit_card",
      name: "Visa Galicia",
      closingDay: 27,
      dueDay: 5,
      currencies: pesos,
    },
  });
  await api.post("http://localhost:4173/api/movements", {
    data: {
      type: "expense",
      occurredOn: today(),
      categoryId: ((await food.json()) as { id: string }).id,
      accountId: ((await card.json()) as { id: string }).id,
      currency: "ARS",
      amountMinor: 100_000_00,
    },
  });

  // Act
  await page.goto("/accounts");
  await page.getByRole("link", { name: /^Visa Galicia/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Visa Galicia" })).toBeVisible();
  await expect(page.getByText(/^\$\s100\.000$/).first()).toBeVisible();

  await page.getByRole("link", { name: "Agregar cargo" }).click();
  await page.getByLabel("Categoría").selectOption({ label: "Intereses" });
  await page.getByLabel("Monto").fill("5000");
  await page.getByRole("button", { name: "Guardar cargo" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Visa Galicia" })).toBeVisible();
  await expect(page.getByText(/^\$\s105\.000$/).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Cargos" })).toBeVisible();

  await page.getByRole("link", { name: "Pagar resumen" }).click();
  await page.getByRole("button", { name: /^Pagar \$\s105\.000$/ }).click();

  // Assert
  await expect(page.getByRole("heading", { level: 1, name: "Visa Galicia" })).toBeVisible();
  await expect(page.getByText("Pagos")).toBeVisible();
  await expect(page.getByText(/^\$\s0$/).first()).toBeVisible();
  await expect(page.getByText(/^\$\s105\.000$/).first()).toBeVisible();
});

const origin = "http://localhost:4173";

type StatementRow = { id: string; periodMonth: string; closingDate: string; dueDate: string };

async function openedCard(context: BrowserContext) {
  const userId = await signInAsNewUser(context);
  await seedFinancialCharges(userId);
  const api = context.request;
  const pesos = [{ currency: "ARS", openingBalanceMinor: 0 }];
  await api.post(`${origin}/api/accounts`, {
    data: { type: "bank", name: "Galicia", currencies: pesos },
  });
  const card = (await (
    await api.post(`${origin}/api/accounts`, {
      data: {
        type: "credit_card",
        name: "Visa Galicia",
        closingDay: 27,
        dueDay: 5,
        currencies: pesos,
      },
    })
  ).json()) as { id: string };
  const group = await api.post(`${origin}/api/category-groups`, { data: { name: "Comida" } });
  const food = (await (
    await api.post(`${origin}/api/categories`, {
      data: {
        type: "expense",
        groupId: ((await group.json()) as { id: string }).id,
        name: "Supermercado",
        icon: null,
        color: 1,
      },
    })
  ).json()) as { id: string };
  await api.post(`${origin}/api/movements`, {
    data: {
      type: "expense",
      occurredOn: today(),
      categoryId: food.id,
      accountId: card.id,
      currency: "ARS",
      amountMinor: 100_000_00,
    },
  });
  const listed = (await (
    await api.get(`${origin}/api/statements?accountId=${card.id}`)
  ).json()) as {
    items: StatementRow[];
  };
  return { api, card, statements: listed.items };
}

test("corrects the closing and due dates of a statement", async ({ context, page }) => {
  // Arrange
  const { api, card, statements } = await openedCard(context);
  const target = statements[0] as StatementRow;
  const [year, month] = target.periodMonth.split("-").map(Number) as [number, number];
  const nextMonth =
    month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const closing = `${target.periodMonth}-20`;
  const due = `${nextMonth}-12`;

  // Act
  await page.goto(`/accounts/${card.id}/statement?period=${target.periodMonth}`);
  await page.getByRole("button", { name: "Editar fechas" }).click();
  await page.getByLabel("Fecha de cierre").fill(closing);
  await page.getByLabel("Fecha de vencimiento").fill(due);
  await page.getByRole("button", { name: "Guardar fechas" }).click();

  // Assert
  await expect(page.getByText(/cuotas de este período se reasignaron/)).toBeVisible();
  const refreshed = (await (await api.get(`${origin}/api/statements/${target.id}`)).json()) as {
    closingDate: string;
    dueDate: string;
  };
  expect(refreshed).toMatchObject({ closingDate: closing, dueDate: due });
});

test("sends a statement charge opened from Movimientos to its statement", async ({
  context,
  page,
}) => {
  // Arrange
  const { card, statements } = await openedCard(context);
  const target = statements[0] as StatementRow;
  await page.goto(`/accounts/${card.id}/statement?period=${target.periodMonth}`);
  await page.getByRole("link", { name: "Agregar cargo" }).click();
  await page.getByLabel("Categoría").selectOption({ label: "Intereses" });
  await page.getByLabel("Monto").fill("5000");
  await page.getByRole("button", { name: "Guardar cargo" }).click();
  await expect(page.getByRole("region", { name: "Cargos" })).toBeVisible();

  // Act
  await page.goto("/movements");
  await page
    .getByRole("link", { name: /Intereses/ })
    .first()
    .click();

  // Assert
  await expect(page).toHaveURL(new RegExp(`/accounts/${card.id}/statement/charges/`));
});

test("explains a statement charge opened directly by its movement address", async ({
  context,
  page,
}) => {
  // Arrange
  const { api, card, statements } = await openedCard(context);
  const target = statements[0] as StatementRow;
  const added = (await (
    await api.post(`${origin}/api/statements/${target.id}/charges`, {
      data: { categoryId: await interestCategory(api), currency: "ARS", amountMinor: 500_000 },
    })
  ).json()) as { charges: { movementId: string }[] };
  const movementId = added.charges[0]?.movementId;

  // Act
  await page.goto(`/movements/${movementId}/edit`);
  await expect(page.getByText("Este movimiento pertenece a un resumen")).toBeVisible();
  await page.getByRole("button", { name: "Ir al resumen" }).click();

  // Assert
  await expect(page).toHaveURL(new RegExp(`/accounts/${card.id}/statement/charges/${movementId}`));
});

async function interestCategory(api: APIRequestContext): Promise<string> {
  const catalog = (await (await api.get(`${origin}/api/categories`)).json()) as {
    expenseGroups: { categories: { id: string; nameKey: string | null }[] }[];
  };
  const found = catalog.expenseGroups
    .flatMap((group) => group.categories)
    .find((category) => category.nameKey === "defaults.category.interest");
  return found?.id ?? "";
}
