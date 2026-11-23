import { seedUserDefaults } from "@miplata/db";
import type { CategoriesResponse, CategoryDto } from "@miplata/shared";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthHarness } from "../test/auth-harness";

type Harness = Awaited<ReturnType<typeof createAuthHarness>>;
type Person = { id: string; cookie: string };
type Group = CategoriesResponse["expenseGroups"][number];

let harness: Harness;
let counter = 0;

beforeAll(async () => {
  harness = await createAuthHarness(async (db, userId) => {
    await seedUserDefaults(db, userId);
  });
});

afterAll(async () => {
  await harness.close();
});

async function newPerson(): Promise<Person> {
  counter += 1;
  const id = await harness.signUpWithGoogle(`person-${counter}@example.com`, `Person ${counter}`);
  return { id, cookie: await harness.cookieFor(id) };
}

function call(person: Person | null, method: string, path: string, body?: unknown) {
  return harness.app.request(`/api${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(person ? { cookie: person.cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function catalogOf(person: Person): Promise<CategoriesResponse> {
  return (await (await call(person, "GET", "/categories")).json()) as CategoriesResponse;
}

async function groupNamed(person: Person, nameKey: string): Promise<Group> {
  const catalog = await catalogOf(person);
  return catalog.expenseGroups.find((group) => group.nameKey === nameKey) as Group;
}

async function createExpense(person: Person, groupId: string, name: string, color = 1) {
  const response = await call(person, "POST", "/categories", {
    type: "expense",
    groupId,
    name,
    icon: "paw-print",
    color,
  });
  return { response, body: (await response.json()) as CategoryDto };
}

async function insertMovement(userId: string, categoryId: string) {
  await harness.pool.query(
    "insert into movement (user_id, type, occurred_on, category_id) values ($1, 'expense', '2026-01-15', $2)",
    [userId, categoryId],
  );
}

describe("GET /api/categories", () => {
  it("returns the seeded defaults grouped, with translation keys and no custom names", async () => {
    // Arrange
    const person = await newPerson();

    // Act
    const catalog = await catalogOf(person);

    // Assert
    expect(catalog.expenseGroups).toHaveLength(9);
    expect(catalog.expenseGroups[0]).toMatchObject({
      nameKey: "defaults.group.housing",
      name: null,
    });
    expect(catalog.expenseGroups[0]?.categories[0]).toMatchObject({
      nameKey: "defaults.category.buildingFees",
      name: null,
      icon: "building",
      isActive: true,
    });
    expect(catalog.income).toHaveLength(7);
    expect(catalog.income.every((item) => item.groupId === null && item.type === "income")).toBe(
      true,
    );
  });

  it("answers 401 without a session", async () => {
    // Arrange
    const nobody = null;

    // Act
    const response = await call(nobody, "GET", "/categories");

    // Assert
    expect(response.status).toBe(401);
  });

  it("returns an empty catalog for a user without data", async () => {
    // Arrange
    const person = await newPerson();
    await harness.pool.query("delete from category where user_id = $1", [person.id]);
    await harness.pool.query("delete from category_group where user_id = $1", [person.id]);

    // Act
    const catalog = await catalogOf(person);

    // Assert
    expect(catalog).toEqual({ expenseGroups: [], income: [] });
  });
});

describe("POST /api/categories", () => {
  it("creates an expense category inside a group, after the existing ones", async () => {
    // Arrange
    const person = await newPerson();
    const housing = await groupNamed(person, "defaults.group.housing");

    // Act
    const { response, body } = await createExpense(person, housing.id, "  Garden   care ", 3);

    // Assert
    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      type: "expense",
      groupId: housing.id,
      name: "Garden care",
      nameKey: null,
      icon: "paw-print",
      color: 3,
      isActive: true,
      sortOrder: housing.categories.length,
    });
    const after = await groupNamed(person, "defaults.group.housing");
    expect(after.categories.at(-1)?.id).toBe(body.id);
  });

  it("creates an income category without a group and without an icon", async () => {
    // Arrange
    const person = await newPerson();

    // Act
    const response = await call(person, "POST", "/categories", {
      type: "income",
      name: "Prize",
      icon: null,
      color: 2,
    });

    // Assert
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ type: "income", groupId: null, icon: null });
    expect((await catalogOf(person)).income.at(-1)?.name).toBe("Prize");
  });

  it("rejects invalid placement, icon, color and name with 400", async () => {
    // Arrange
    const person = await newPerson();
    const housing = await groupNamed(person, "defaults.group.housing");
    const base = { type: "expense", groupId: housing.id, name: "Valid", icon: "key", color: 1 };

    // Act
    const statuses = await Promise.all([
      call(person, "POST", "/categories", { ...base, groupId: undefined }),
      call(person, "POST", "/categories", { ...base, type: "income" }),
      call(person, "POST", "/categories", { ...base, icon: "skull" }),
      call(person, "POST", "/categories", { ...base, color: 6 }),
      call(person, "POST", "/categories", { ...base, name: "   " }),
      call(person, "POST", "/categories", { ...base, groupId: "not-a-uuid" }),
      call(person, "POST", "/categories", { ...base, groupId: crypto.randomUUID() }),
    ]).then((responses) => responses.map((response) => response.status));

    // Assert
    expect(statuses).toEqual([400, 400, 400, 400, 400, 400, 400]);
  });

  it("keeps names unique per user and type, ignoring case and spacing", async () => {
    // Arrange
    const person = await newPerson();
    const food = await groupNamed(person, "defaults.group.food");
    const health = await groupNamed(person, "defaults.group.health");
    await createExpense(person, food.id, "Bakery");

    // Act
    const sameGroup = await createExpense(person, food.id, "bakery");
    const otherGroup = await createExpense(person, health.id, " BAKERY ");
    const income = await call(person, "POST", "/categories", {
      type: "income",
      name: "Bakery",
      icon: null,
      color: 1,
    });

    // Assert
    expect(sameGroup.response.status).toBe(409);
    expect(sameGroup.body).toEqual({ error: "name_taken" });
    expect(otherGroup.response.status).toBe(409);
    expect(income.status).toBe(201);
  });

  it("lets another user reuse the same name", async () => {
    // Arrange
    const first = await newPerson();
    const second = await newPerson();
    const firstFood = await groupNamed(first, "defaults.group.food");
    const secondFood = await groupNamed(second, "defaults.group.food");
    await createExpense(first, firstFood.id, "Shared name");

    // Act
    const created = await createExpense(second, secondFood.id, "Shared name");

    // Assert
    expect(created.response.status).toBe(201);
  });
});

describe("PATCH /api/categories/:id", () => {
  it("shows the translated default name until renamed, then the custom name", async () => {
    // Arrange
    const person = await newPerson();
    const housing = await groupNamed(person, "defaults.group.housing");
    const rent = housing.categories.find((item) => item.nameKey === "defaults.category.rent");

    // Act
    const response = await call(person, "PATCH", `/categories/${rent?.id}`, { name: "Alquiler" });

    // Assert
    expect(rent).toMatchObject({ name: null, nameKey: "defaults.category.rent" });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Alquiler", nameKey: null });
  });

  it("edits icon and color, and can clear the icon", async () => {
    // Arrange
    const person = await newPerson();
    const food = await groupNamed(person, "defaults.group.food");
    const target = food.categories[0] as CategoryDto;

    // Act
    const changed = await call(person, "PATCH", `/categories/${target.id}`, {
      icon: "coffee",
      color: 5,
    });
    const cleared = await call(person, "PATCH", `/categories/${target.id}`, { icon: null });

    // Assert
    expect(await changed.json()).toMatchObject({ icon: "coffee", color: 5 });
    expect(await cleared.json()).toMatchObject({ icon: null, color: 5 });
  });

  it("moves an expense category to another group", async () => {
    // Arrange
    const person = await newPerson();
    const food = await groupNamed(person, "defaults.group.food");
    const health = await groupNamed(person, "defaults.group.health");
    const target = food.categories[0] as CategoryDto;

    // Act
    const response = await call(person, "PATCH", `/categories/${target.id}`, {
      groupId: health.id,
    });

    // Assert
    expect(response.status).toBe(200);
    const moved = (await groupNamed(person, "defaults.group.health")).categories;
    expect(moved.at(-1)?.id).toBe(target.id);
  });

  it("refuses a duplicate name but accepts keeping the own name", async () => {
    // Arrange
    const person = await newPerson();
    const food = await groupNamed(person, "defaults.group.food");
    const first = (await createExpense(person, food.id, "Alpha")).body;
    const second = (await createExpense(person, food.id, "Beta")).body;

    // Act
    const duplicate = await call(person, "PATCH", `/categories/${second.id}`, { name: "alpha" });
    const same = await call(person, "PATCH", `/categories/${first.id}`, {
      name: "Alpha",
      color: 2,
    });

    // Assert
    expect(duplicate.status).toBe(409);
    expect(same.status).toBe(200);
  });

  it("rejects an empty patch, a group for income and a missing group", async () => {
    // Arrange
    const person = await newPerson();
    const catalog = await catalogOf(person);
    const income = catalog.income[0] as CategoryDto;
    const expense = catalog.expenseGroups[0]?.categories[0] as CategoryDto;

    // Act
    const statuses = (
      await Promise.all([
        call(person, "PATCH", `/categories/${expense.id}`, {}),
        call(person, "PATCH", `/categories/${income.id}`, { groupId: expense.groupId }),
        call(person, "PATCH", `/categories/${expense.id}`, { groupId: crypto.randomUUID() }),
      ])
    ).map((response) => response.status);

    // Assert
    expect(statuses).toEqual([400, 400, 400]);
  });

  it("answers 404 for an unknown id and for a malformed id", async () => {
    // Arrange
    const person = await newPerson();

    // Act
    const unknown = await call(person, "PATCH", `/categories/${crypto.randomUUID()}`, { color: 2 });
    const malformed = await call(person, "PATCH", "/categories/nope", { color: 2 });

    // Assert
    expect([unknown.status, malformed.status]).toEqual([404, 404]);
  });
});

describe("deactivate, reactivate and delete", () => {
  it("deactivates and reactivates a category and keeps it in the catalog", async () => {
    // Arrange
    const person = await newPerson();
    const food = await groupNamed(person, "defaults.group.food");
    const target = food.categories[0] as CategoryDto;

    // Act
    const off = await call(person, "POST", `/categories/${target.id}/deactivate`);
    const listedOff = (await groupNamed(person, "defaults.group.food")).categories[0];
    const on = await call(person, "POST", `/categories/${target.id}/reactivate`);
    const listedOn = (await groupNamed(person, "defaults.group.food")).categories[0];

    // Assert
    expect(off.status).toBe(200);
    expect(listedOff?.isActive).toBe(false);
    expect(on.status).toBe(200);
    expect(listedOn?.isActive).toBe(true);
  });

  it("deletes a category without movements", async () => {
    // Arrange
    const person = await newPerson();
    const food = await groupNamed(person, "defaults.group.food");
    const created = (await createExpense(person, food.id, "Disposable")).body;

    // Act
    const response = await call(person, "DELETE", `/categories/${created.id}`);

    // Assert
    expect(response.status).toBe(204);
    const ids = (await groupNamed(person, "defaults.group.food")).categories.map((c) => c.id);
    expect(ids).not.toContain(created.id);
  });

  it("refuses to delete a category with movements, but it can be deactivated instead", async () => {
    // Arrange
    const person = await newPerson();
    const food = await groupNamed(person, "defaults.group.food");
    const used = (await createExpense(person, food.id, "Used")).body;
    await insertMovement(person.id, used.id);

    // Act
    const refused = await call(person, "DELETE", `/categories/${used.id}`);
    const deactivated = await call(person, "POST", `/categories/${used.id}/deactivate`);
    const stillRefused = await call(person, "DELETE", `/categories/${used.id}`);

    // Assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: "category_in_use" });
    expect(deactivated.status).toBe(200);
    expect(stillRefused.status).toBe(409);
    const ids = (await groupNamed(person, "defaults.group.food")).categories.map((c) => c.id);
    expect(ids).toContain(used.id);
  });

  it("answers 404 for unknown and malformed ids", async () => {
    // Arrange
    const person = await newPerson();
    const unknown = crypto.randomUUID();

    // Act
    const statuses = (
      await Promise.all([
        call(person, "DELETE", `/categories/${unknown}`),
        call(person, "POST", `/categories/${unknown}/deactivate`),
        call(person, "POST", `/categories/${unknown}/reactivate`),
        call(person, "DELETE", "/categories/nope"),
      ])
    ).map((response) => response.status);

    // Assert
    expect(statuses).toEqual([404, 404, 404, 404]);
  });
});

describe("category groups", () => {
  it("creates a group, rejects a duplicate and renames a default group", async () => {
    // Arrange
    const person = await newPerson();
    const housing = await groupNamed(person, "defaults.group.housing");

    // Act
    const created = await call(person, "POST", "/category-groups", { name: " Pets " });
    const duplicate = await call(person, "POST", "/category-groups", { name: "pets" });
    const renamed = await call(person, "PATCH", `/category-groups/${housing.id}`, {
      name: "Casa",
    });
    const clash = await call(person, "PATCH", `/category-groups/${housing.id}`, { name: "PETS" });

    // Assert
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ name: "Pets", nameKey: null, sortOrder: 9 });
    expect(duplicate.status).toBe(409);
    expect(renamed.status).toBe(200);
    expect(await renamed.json()).toMatchObject({ name: "Casa", nameKey: null });
    expect(clash.status).toBe(409);
  });

  it("rejects an invalid name with 400 and unknown ids with 404", async () => {
    // Arrange
    const person = await newPerson();

    // Act
    const statuses = (
      await Promise.all([
        call(person, "POST", "/category-groups", { name: " " }),
        call(person, "PATCH", `/category-groups/${crypto.randomUUID()}`, { name: "X" }),
        call(person, "PATCH", "/category-groups/nope", { name: "X" }),
        call(person, "DELETE", `/category-groups/${crypto.randomUUID()}`),
        call(person, "DELETE", "/category-groups/nope"),
      ])
    ).map((response) => response.status);

    // Assert
    expect(statuses).toEqual([400, 404, 404, 404, 404]);
  });

  it("refuses to delete a group with categories and deletes it once empty", async () => {
    // Arrange
    const person = await newPerson();
    const created = (await (
      await call(person, "POST", "/category-groups", { name: "Temporary" })
    ).json()) as { id: string };
    const category = (await createExpense(person, created.id, "Inside")).body;

    // Act
    const refused = await call(person, "DELETE", `/category-groups/${created.id}`);
    await call(person, "DELETE", `/categories/${category.id}`);
    const deleted = await call(person, "DELETE", `/category-groups/${created.id}`);

    // Assert
    expect(refused.status).toBe(409);
    expect(await refused.json()).toEqual({ error: "group_not_empty" });
    expect(deleted.status).toBe(204);
    const groups = (await catalogOf(person)).expenseGroups.map((group) => group.id);
    expect(groups).not.toContain(created.id);
  });
});

describe("data isolation", () => {
  async function twoPeople() {
    const owner = await newPerson();
    const intruder = await newPerson();
    const group = await groupNamed(owner, "defaults.group.food");
    const target = (await createExpense(owner, group.id, `Private ${counter}`)).body;
    return { owner, intruder, group, target };
  }

  it("never lists another user's categories or groups", async () => {
    // Arrange
    const { owner, intruder, group, target } = await twoPeople();

    // Act
    const catalog = await catalogOf(intruder);

    // Assert
    const ownerIds = new Set([
      group.id,
      target.id,
      ...(await catalogOf(owner)).expenseGroups.map((item) => item.id),
    ]);
    const seen = [
      ...catalog.expenseGroups.map((item) => item.id),
      ...catalog.expenseGroups.flatMap((item) => item.categories.map((c) => c.id)),
      ...catalog.income.map((item) => item.id),
    ];
    expect(seen.filter((id) => ownerIds.has(id))).toEqual([]);
  });

  it("cannot create a category inside another user's group", async () => {
    // Arrange
    const { owner, intruder, group } = await twoPeople();

    // Act
    const response = await createExpense(intruder, group.id, "Sneaky");

    // Assert
    expect(response.response.status).toBe(400);
    const names = (await groupNamed(owner, "defaults.group.food")).categories.map((c) => c.name);
    expect(names).not.toContain("Sneaky");
  });

  it("cannot edit, move into a foreign group, deactivate, reactivate or delete another user's category", async () => {
    // Arrange
    const { owner, intruder, group, target } = await twoPeople();
    const own = (await groupNamed(intruder, "defaults.group.health")).categories[0] as CategoryDto;

    // Act
    const results = (
      await Promise.all([
        call(intruder, "PATCH", `/categories/${target.id}`, { name: "Hijacked" }),
        call(intruder, "POST", `/categories/${target.id}/deactivate`),
        call(intruder, "POST", `/categories/${target.id}/reactivate`),
        call(intruder, "DELETE", `/categories/${target.id}`),
        call(intruder, "PATCH", `/categories/${own.id}`, { groupId: group.id }),
      ])
    ).map((response) => response.status);

    // Assert
    expect(results).toEqual([404, 404, 404, 404, 400]);
    const untouched = (await groupNamed(owner, "defaults.group.food")).categories.find(
      (item) => item.id === target.id,
    );
    expect(untouched).toMatchObject({ name: target.name, isActive: true });
    const ownAfter = (await groupNamed(intruder, "defaults.group.health")).categories.find(
      (item) => item.id === own.id,
    );
    expect(ownAfter?.groupId).not.toBe(group.id);
  });

  it("cannot rename or delete another user's group", async () => {
    // Arrange
    const { owner, intruder, group } = await twoPeople();

    // Act
    const results = (
      await Promise.all([
        call(intruder, "PATCH", `/category-groups/${group.id}`, { name: "Hijacked" }),
        call(intruder, "DELETE", `/category-groups/${group.id}`),
      ])
    ).map((response) => response.status);

    // Assert
    expect(results).toEqual([404, 404]);
    const after = await groupNamed(owner, "defaults.group.food");
    expect(after.id).toBe(group.id);
    expect(after.name).toBe(group.name);
  });

  it("ignores a user id sent in the body, query or headers", async () => {
    // Arrange
    const { owner, intruder } = await twoPeople();

    // Act
    const response = await harness.app.request(`/api/categories?userId=${owner.id}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: intruder.cookie,
        "x-user-id": owner.id,
      },
      body: JSON.stringify({
        type: "income",
        name: "Spoof",
        icon: null,
        color: 1,
        userId: owner.id,
      }),
    });

    // Assert
    expect(response.status).toBe(201);
    expect((await catalogOf(intruder)).income.map((item) => item.name)).toContain("Spoof");
    expect((await catalogOf(owner)).income.map((item) => item.name)).not.toContain("Spoof");
  });
});
