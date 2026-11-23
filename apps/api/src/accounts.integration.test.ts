import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthHarness } from "./test/auth-harness";

type Harness = Awaited<ReturnType<typeof createAuthHarness>>;

let harness: Harness;
let cookieA: string;
let cookieB: string;
let userA: string;
let userB: string;

beforeAll(async () => {
  harness = await createAuthHarness();
  userA = await harness.signUpWithGoogle("a@example.com");
  userB = await harness.signUpWithGoogle("b@example.com");
  cookieA = await harness.cookieFor(userA);
  cookieB = await harness.cookieFor(userB);
});

afterAll(async () => {
  await harness.close();
});

function call(method: string, path: string, cookie?: string, body?: unknown) {
  const hasBody = body !== undefined && method !== "GET";
  return harness.app.request(`/api${path}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...(hasBody ? { "content-type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });
}

type Body = {
  id: string;
  name: string | null;
  nameKey: string | null;
  isActive: boolean;
  canDelete: boolean;
  closingDay: number | null;
  dueDay: number | null;
  currencies: { currency: string; balanceMinor: number }[];
  totals: { currency: string; totalMinor: number }[];
  lines: { type: string; currency: string; balanceMinor: number }[];
  error: string;
  reason: string;
};

async function json(response: Response) {
  return (await response.json()) as Body;
}

async function institutionId(name: string) {
  const list = (await (await call("GET", "/institutions", cookieA)).json()) as {
    id: string;
    name: string;
  }[];
  return (list.find((item) => item.name === name) as { id: string }).id;
}

const pesos = [{ currency: "ARS", openingBalanceMinor: 10_000 }];

async function createCash(cookie: string, name = "Pocket") {
  const response = await call("POST", "/accounts", cookie, {
    type: "cash",
    name,
    currencies: pesos,
  });
  return json(response);
}

async function createPersonFor(cookie: string, name = "Juan") {
  return json(await call("POST", "/people", cookie, { name, currencies: pesos }));
}

async function postTo(userId: string, accountId: string, currency: string, amountMinor: number) {
  const group = await harness.pool.query(
    "insert into category_group (user_id, name) values ($1, 'g' || gen_random_uuid()) returning id",
    [userId],
  );
  const category = await harness.pool.query(
    "insert into category (user_id, type, group_id, name, color) values ($1, 'expense', $2, 'c' || gen_random_uuid(), 1) returning id",
    [userId, group.rows[0].id],
  );
  const movement = await harness.pool.query(
    "insert into movement (user_id, type, occurred_on, category_id) values ($1, 'expense', '2026-01-15', $2) returning id",
    [userId, category.rows[0].id],
  );
  await harness.pool.query(
    "insert into posting (user_id, movement_id, account_id, currency, amount_minor) values ($1, $2, $3, $4, $5)",
    [userId, movement.rows[0].id, accountId, currency, amountMinor],
  );
}

const endpoints = [
  { method: "GET", path: "/accounts" },
  { method: "POST", path: "/accounts" },
  { method: "GET", path: "/accounts/00000000-0000-4000-8000-000000000001" },
  { method: "PATCH", path: "/accounts/00000000-0000-4000-8000-000000000001" },
  { method: "POST", path: "/accounts/00000000-0000-4000-8000-000000000001/deactivate" },
  { method: "POST", path: "/accounts/00000000-0000-4000-8000-000000000001/reactivate" },
  { method: "DELETE", path: "/accounts/00000000-0000-4000-8000-000000000001" },
  { method: "GET", path: "/people" },
  { method: "POST", path: "/people" },
  { method: "GET", path: "/people/00000000-0000-4000-8000-000000000001" },
  { method: "PATCH", path: "/people/00000000-0000-4000-8000-000000000001" },
  { method: "POST", path: "/people/00000000-0000-4000-8000-000000000001/deactivate" },
  { method: "POST", path: "/people/00000000-0000-4000-8000-000000000001/reactivate" },
  { method: "DELETE", path: "/people/00000000-0000-4000-8000-000000000001" },
  { method: "GET", path: "/institutions" },
  { method: "GET", path: "/balance" },
];

describe("authentication", () => {
  it.each(endpoints)("$method $path rejects requests without a session", async (endpoint) => {
    // Arrange
    const noCookie = undefined;

    // Act
    const response = await call(endpoint.method, endpoint.path, noCookie, {});

    // Assert
    expect(response.status).toBe(401);
  });
});

describe("institutions", () => {
  it("lists the catalog of banks and wallets", async () => {
    // Arrange
    const path = "/institutions";

    // Act
    const response = await call("GET", path, cookieA);
    const list = (await response.json()) as { kind: string; name: string }[];

    // Assert
    expect(response.status).toBe(200);
    expect(list).toHaveLength(19);
    expect(list.map((item) => item.name)).toContain("Mercado Pago");
    expect(new Set(list.map((item) => item.kind))).toEqual(new Set(["bank", "wallet"]));
  });

  it("returns the logo path of institutions that have one and null for the rest", async () => {
    // Arrange
    const path = "/institutions";

    // Act
    const response = await call("GET", path, cookieA);
    const list = (await response.json()) as { name: string; logoPath: string | null }[];
    const logoOf = (name: string) => list.find((item) => item.name === name)?.logoPath;

    // Assert
    expect(logoOf("Galicia")).toBe("/institutions/galicia.svg");
    expect(logoOf("Mercado Pago")).toBe("/institutions/mercado-pago.svg");
    expect(logoOf("Brubank")).toBeNull();
    expect(list.filter((item) => item.logoPath !== null)).toHaveLength(12);
  });
});

describe("creating accounts", () => {
  it("creates a cash account with both currencies and opening balances", async () => {
    // Arrange
    const body = {
      type: "cash",
      name: "Savings box",
      currencies: [
        { currency: "ARS", openingBalanceMinor: 41_000_00 },
        { currency: "USD", openingBalanceMinor: 450_00 },
      ],
    };

    // Act
    const response = await call("POST", "/accounts", cookieA, body);
    const created = await json(response);

    // Assert
    expect(response.status).toBe(201);
    expect(created).toMatchObject({
      type: "cash",
      name: "Savings box",
      isActive: true,
      canDelete: true,
      currencies: [
        { currency: "ARS", openingBalanceMinor: 41_000_00, balanceMinor: 41_000_00 },
        { currency: "USD", openingBalanceMinor: 450_00, balanceMinor: 450_00 },
      ],
    });
  });

  it("creates a bank account from the catalog and names it after the institution", async () => {
    // Arrange
    const body = {
      type: "bank",
      institutionId: await institutionId("Galicia"),
      currencies: pesos,
    };

    // Act
    const response = await call("POST", "/accounts", cookieA, body);
    const created = await json(response);

    // Assert
    expect(response.status).toBe(201);
    expect(created).toMatchObject({
      name: "Galicia",
      institution: { name: "Galicia", kind: "bank" },
    });
  });

  it("creates a credit card with closing and due days", async () => {
    // Arrange
    const body = {
      type: "credit_card",
      name: "Visa Galicia",
      closingDay: 27,
      dueDay: 5,
      currencies: [{ currency: "ARS", openingBalanceMinor: -50_000 }],
    };

    // Act
    const response = await call("POST", "/accounts", cookieA, body);
    const created = await json(response);

    // Assert
    expect(response.status).toBe(201);
    expect(created).toMatchObject({ closingDay: 27, dueDay: 5 });
    expect(created.currencies[0]?.balanceMinor).toBe(-50_000);
  });

  it.each([
    ["an unknown type", { type: "savings", name: "x", currencies: pesos }],
    ["person through the accounts endpoint", { type: "person", name: "x", currencies: pesos }],
    ["no currencies", { type: "cash", name: "x", currencies: [] }],
    ["a repeated currency", { type: "cash", name: "x", currencies: [...pesos, ...pesos] }],
    [
      "a fractional amount",
      { type: "cash", name: "x", currencies: [{ currency: "ARS", openingBalanceMinor: 1.5 }] },
    ],
    ["card days on cash", { type: "cash", name: "x", closingDay: 3, currencies: pesos }],
    ["a card day of 32", { type: "credit_card", name: "x", closingDay: 32, currencies: pesos }],
    ["no name", { type: "cash", currencies: pesos }],
    [
      "a wallet institution on a bank",
      { type: "bank", institutionId: "00000000-0000-4000-8000-000000000009", currencies: pesos },
    ],
  ])("rejects %s", async (_label, body) => {
    // Arrange
    const payload = body;

    // Act
    const response = await call("POST", "/accounts", cookieA, payload);

    // Assert
    expect(response.status).toBe(400);
  });

  it("rejects an institution of the wrong kind", async () => {
    // Arrange
    const body = {
      type: "bank",
      institutionId: await institutionId("Mercado Pago"),
      currencies: pesos,
    };

    // Act
    const response = await call("POST", "/accounts", cookieA, body);

    // Assert
    expect(response.status).toBe(400);
    expect(await json(response)).toMatchObject({ reason: "institution_kind_mismatch" });
  });

  it("rejects a body that is not JSON", async () => {
    // Arrange
    const request = { method: "POST", headers: { cookie: cookieA }, body: "not json" };

    // Act
    const response = await harness.app.request("/api/accounts", request);

    // Assert
    expect(response.status).toBe(400);
  });
});

describe("listing and reading accounts", () => {
  it("lists only the accounts of the signed in user", async () => {
    // Arrange
    const mine = await createCash(cookieA, "Listed by A");
    const theirs = await createCash(cookieB, "Listed by B");

    // Act
    const listA = (await (await call("GET", "/accounts", cookieA)).json()) as { id: string }[];
    const listB = (await (await call("GET", "/accounts", cookieB)).json()) as { id: string }[];

    // Assert
    expect(listA.map((item) => item.id)).toContain(mine.id);
    expect(listA.map((item) => item.id)).not.toContain(theirs.id);
    expect(listB.map((item) => item.id)).toContain(theirs.id);
    expect(listB.map((item) => item.id)).not.toContain(mine.id);
  });

  it("does not list people as accounts", async () => {
    // Arrange
    const person = await createPersonFor(cookieA, "Only a person");

    // Act
    const list = (await (await call("GET", "/accounts", cookieA)).json()) as { id: string }[];

    // Assert
    expect(list.map((item) => item.id)).not.toContain(person.id);
  });

  it("returns 404 for a malformed id", async () => {
    // Arrange
    const path = "/accounts/not-a-uuid";

    // Act
    const response = await call("GET", path, cookieA);

    // Assert
    expect(response.status).toBe(404);
  });
});

describe("data isolation between users", () => {
  it("hides another user's account on read", async () => {
    // Arrange
    const theirs = await createCash(cookieB, "Private B");

    // Act
    const response = await call("GET", `/accounts/${theirs.id}`, cookieA);

    // Assert
    expect(response.status).toBe(404);
  });

  it("does not let another user edit the account", async () => {
    // Arrange
    const theirs = await createCash(cookieB, "Edit guard");

    // Act
    const response = await call("PATCH", `/accounts/${theirs.id}`, cookieA, { name: "Hijacked" });

    // Assert
    const after = await json(await call("GET", `/accounts/${theirs.id}`, cookieB));
    expect(response.status).toBe(404);
    expect(after.name).toBe("Edit guard");
  });

  it("does not let another user deactivate or reactivate the account", async () => {
    // Arrange
    const theirs = await createCash(cookieB, "Toggle guard");

    // Act
    const deactivate = await call("POST", `/accounts/${theirs.id}/deactivate`, cookieA);
    const reactivate = await call("POST", `/accounts/${theirs.id}/reactivate`, cookieA);

    // Assert
    const after = await json(await call("GET", `/accounts/${theirs.id}`, cookieB));
    expect([deactivate.status, reactivate.status]).toEqual([404, 404]);
    expect(after.isActive).toBe(true);
  });

  it("does not let another user delete the account", async () => {
    // Arrange
    const theirs = await createCash(cookieB, "Delete guard");

    // Act
    const response = await call("DELETE", `/accounts/${theirs.id}`, cookieA);

    // Assert
    const after = await call("GET", `/accounts/${theirs.id}`, cookieB);
    expect(response.status).toBe(404);
    expect(after.status).toBe(200);
  });

  it("applies the same isolation to people", async () => {
    // Arrange
    const theirs = await createPersonFor(cookieB, "Private person");

    // Act
    const responses = await Promise.all([
      call("GET", `/people/${theirs.id}`, cookieA),
      call("PATCH", `/people/${theirs.id}`, cookieA, { name: "Hijacked" }),
      call("POST", `/people/${theirs.id}/deactivate`, cookieA),
      call("POST", `/people/${theirs.id}/reactivate`, cookieA),
      call("DELETE", `/people/${theirs.id}`, cookieA),
    ]);
    const list = (await (await call("GET", "/people", cookieA)).json()) as { id: string }[];

    // Assert
    expect(responses.map((response) => response.status)).toEqual([404, 404, 404, 404, 404]);
    expect(list.map((item) => item.id)).not.toContain(theirs.id);
    expect((await call("GET", `/people/${theirs.id}`, cookieB)).status).toBe(200);
  });

  it("keeps people and accounts apart even for the owner", async () => {
    // Arrange
    const person = await createPersonFor(cookieA, "Not an account");
    const cash = await createCash(cookieA, "Not a person");

    // Act
    const personAsAccount = await call("GET", `/accounts/${person.id}`, cookieA);
    const cashAsPerson = await call("DELETE", `/people/${cash.id}`, cookieA);

    // Assert
    expect([personAsAccount.status, cashAsPerson.status]).toEqual([404, 404]);
  });

  it("calculates the balance only from the user's own accounts", async () => {
    // Arrange
    const solo = await harness.signUpWithGoogle("solo@example.com");
    const soloCookie = await harness.cookieFor(solo);
    await createCash(soloCookie, "Solo cash");

    // Act
    const balance = await json(await call("GET", "/balance", soloCookie));

    // Assert
    expect(balance.totals).toEqual([
      { currency: "ARS", totalMinor: 10_000 },
      { currency: "USD", totalMinor: 0 },
    ]);
    expect(balance.lines).toHaveLength(3);
  });

  it("rejects an update that points to an institution that does not exist", async () => {
    // Arrange
    const bank = await json(
      await call("POST", "/accounts", cookieA, {
        type: "bank",
        institutionId: await institutionId("Macro"),
        currencies: pesos,
      }),
    );

    // Act
    const response = await call("PATCH", `/accounts/${bank.id}`, cookieA, {
      institutionId: "00000000-0000-4000-8000-000000000002",
    });

    // Assert
    expect(response.status).toBe(400);
    expect((await json(response)).reason).toBe("institution_not_found");
  });
});

describe("editing accounts", () => {
  it("renames, changes days and rewrites opening balances", async () => {
    // Arrange
    const card = await json(
      await call("POST", "/accounts", cookieA, {
        type: "credit_card",
        name: "Old name",
        closingDay: 10,
        dueDay: 20,
        currencies: pesos,
      }),
    );

    // Act
    const response = await call("PATCH", `/accounts/${card.id}`, cookieA, {
      name: "New name",
      closingDay: 27,
      dueDay: 5,
      currencies: [
        { currency: "ARS", openingBalanceMinor: -70_000 },
        { currency: "USD", openingBalanceMinor: -2_000 },
      ],
    });
    const updated = await json(response);

    // Assert
    expect(response.status).toBe(200);
    expect(updated).toMatchObject({ name: "New name", closingDay: 27, dueDay: 5 });
    expect(updated.currencies).toMatchObject([
      { currency: "ARS", balanceMinor: -70_000 },
      { currency: "USD", balanceMinor: -2_000 },
    ]);
  });

  async function defaultCashOf(cookie: string) {
    const list = (await (await call("GET", "/accounts", cookie)).json()) as {
      id: string;
      nameKey: string | null;
    }[];
    return list.find((item) => item.nameKey === "defaults.account.cash") as { id: string };
  }

  it("turns the default Cash translation key into a custom name when renamed", async () => {
    // Arrange
    const cookie = await harness.cookieFor(await harness.signUpWithGoogle("rename@example.com"));
    const { id } = await defaultCashOf(cookie);

    // Act
    const before = await json(await call("GET", `/accounts/${id}`, cookie));
    const renamed = await json(await call("PATCH", `/accounts/${id}`, cookie, { name: "Mine" }));

    // Assert
    expect(before).toMatchObject({ name: null, nameKey: "defaults.account.cash" });
    expect(renamed).toMatchObject({ name: "Mine", nameKey: null });
  });

  it("keeps the translation key when only other fields change", async () => {
    // Arrange
    const cookie = await harness.cookieFor(await harness.signUpWithGoogle("keep@example.com"));
    const { id } = await defaultCashOf(cookie);

    // Act
    const updated = await json(
      await call("PATCH", `/accounts/${id}`, cookie, {
        currencies: [{ currency: "ARS", openingBalanceMinor: 700 }],
      }),
    );

    // Assert
    expect(updated).toMatchObject({ name: null, nameKey: "defaults.account.cash" });
    expect(updated.currencies).toMatchObject([{ currency: "ARS", balanceMinor: 700 }]);
  });

  it("cannot change the type or add card days to a bank account", async () => {
    // Arrange
    const bank = await json(
      await call("POST", "/accounts", cookieA, {
        type: "bank",
        institutionId: await institutionId("Macro"),
        currencies: pesos,
      }),
    );

    // Act
    const response = await call("PATCH", `/accounts/${bank.id}`, cookieA, { closingDay: 3 });

    // Assert
    expect(response.status).toBe(400);
  });

  it("refuses to drop a currency that has postings", async () => {
    // Arrange
    const created = await json(
      await call("POST", "/accounts", cookieA, {
        type: "cash",
        name: "Two currencies",
        currencies: [
          { currency: "ARS", openingBalanceMinor: 0 },
          { currency: "USD", openingBalanceMinor: 0 },
        ],
      }),
    );
    await postTo(userA, created.id, "USD", -500);

    // Act
    const response = await call("PATCH", `/accounts/${created.id}`, cookieA, { currencies: pesos });

    // Assert
    expect(response.status).toBe(409);
    expect(await json(response)).toEqual({ error: "currency_in_use" });
  });
});

describe("deleting versus deactivating", () => {
  it("deletes an account that has no postings", async () => {
    // Arrange
    const created = await createCash(cookieA, "Disposable");

    // Act
    const response = await call("DELETE", `/accounts/${created.id}`, cookieA);

    // Assert
    expect(response.status).toBe(204);
    expect((await call("GET", `/accounts/${created.id}`, cookieA)).status).toBe(404);
  });

  it("refuses to delete an account with postings and offers deactivation", async () => {
    // Arrange
    const created = await createCash(cookieA, "Has movements");
    await postTo(userA, created.id, "ARS", -1_000);

    // Act
    const response = await call("DELETE", `/accounts/${created.id}`, cookieA);
    const read = await json(await call("GET", `/accounts/${created.id}`, cookieA));
    const deactivated = await json(
      await call("POST", `/accounts/${created.id}/deactivate`, cookieA),
    );

    // Assert
    expect(response.status).toBe(409);
    expect(await json(response)).toEqual({ error: "account_in_use" });
    expect(read.canDelete).toBe(false);
    expect(deactivated.isActive).toBe(false);
  });

  it("deactivates and reactivates an account", async () => {
    // Arrange
    const created = await createCash(cookieA, "Toggled");

    // Act
    const off = await json(await call("POST", `/accounts/${created.id}/deactivate`, cookieA));
    const on = await json(await call("POST", `/accounts/${created.id}/reactivate`, cookieA));

    // Assert
    expect([off.isActive, on.isActive]).toEqual([false, true]);
  });

  it("refuses to delete a person that has postings", async () => {
    // Arrange
    const person = await createPersonFor(cookieA, "Owes me");
    await postTo(userA, person.id, "ARS", 2_000);

    // Act
    const response = await call("DELETE", `/people/${person.id}`, cookieA);

    // Assert
    expect(response.status).toBe(409);
  });

  it("refuses to delete a card that already has a statement", async () => {
    // Arrange
    const card = await json(
      await call("POST", "/accounts", cookieA, {
        type: "credit_card",
        name: "With statement",
        currencies: pesos,
      }),
    );
    await harness.pool.query(
      "insert into statement (user_id, account_id, period_month, closing_date, due_date) values ($1, $2, '2026-01-01', '2026-01-20', '2026-02-05')",
      [userA, card.id],
    );

    // Act
    const response = await call("DELETE", `/accounts/${card.id}`, cookieA);

    // Assert
    expect(response.status).toBe(409);
  });
});

describe("people", () => {
  it("creates, edits and lists a person with both currencies", async () => {
    // Arrange
    const body = {
      name: "Sofi",
      currencies: [
        { currency: "ARS", openingBalanceMinor: 0 },
        { currency: "USD", openingBalanceMinor: -200_00 },
      ],
    };

    // Act
    const created = await call("POST", "/people", cookieA, body);
    const person = await json(created);
    const edited = await json(
      await call("PATCH", `/people/${person.id}`, cookieA, { name: "Sofia" }),
    );
    const list = (await (await call("GET", "/people", cookieA)).json()) as { id: string }[];

    // Assert
    expect(created.status).toBe(201);
    expect(person).toMatchObject({ type: "person", institution: null, closingDay: null });
    expect(edited.name).toBe("Sofia");
    expect(list.map((item) => item.id)).toContain(person.id);
  });

  it("rejects a person without a name", async () => {
    // Arrange
    const body = { currencies: pesos };

    // Act
    const response = await call("POST", "/people", cookieA, body);

    // Assert
    expect(response.status).toBe(400);
  });
});

describe("balance", () => {
  it("calculates balances from opening balances and postings, with debt and people", async () => {
    // Arrange
    const owner = await harness.signUpWithGoogle("balance@example.com");
    const cookie = await harness.cookieFor(owner);
    const bank = await json(
      await call("POST", "/accounts", cookie, {
        type: "bank",
        institutionId: await institutionId("Galicia"),
        currencies: [
          { currency: "ARS", openingBalanceMinor: 1_000_000 },
          { currency: "USD", openingBalanceMinor: 100_000 },
        ],
      }),
    );
    const card = await json(
      await call("POST", "/accounts", cookie, {
        type: "credit_card",
        name: "Visa",
        currencies: [{ currency: "ARS", openingBalanceMinor: -200_000 }],
      }),
    );
    const juan = await json(
      await call("POST", "/people", cookie, {
        name: "Juan",
        currencies: [{ currency: "ARS", openingBalanceMinor: 50_000 }],
      }),
    );
    const sofi = await json(
      await call("POST", "/people", cookie, {
        name: "Sofi",
        currencies: [{ currency: "USD", openingBalanceMinor: -20_000 }],
      }),
    );
    const closed = await json(
      await call("POST", "/accounts", cookie, {
        type: "cash",
        name: "Closed",
        currencies: [{ currency: "ARS", openingBalanceMinor: 999_999 }],
      }),
    );
    await call("POST", `/accounts/${closed.id}/deactivate`, cookie);
    await postTo(owner, bank.id, "ARS", -300_000);
    await postTo(owner, card.id, "ARS", -100_000);
    await postTo(owner, juan.id, "ARS", 25_000);
    await postTo(owner, sofi.id, "USD", 5_000);

    // Act
    const response = await call("GET", "/balance", cookie);
    const balance = await json(response);

    // Assert
    expect(response.status).toBe(200);
    expect(balance.totals).toEqual([
      { currency: "ARS", totalMinor: 700_000 - 300_000 + 75_000 },
      { currency: "USD", totalMinor: 100_000 - 15_000 },
    ]);
    expect(balance.lines.map((line) => [line.type, line.currency, line.balanceMinor])).toEqual([
      ["bank", "ARS", 700_000],
      ["bank", "USD", 100_000],
      ["cash", "ARS", 0],
      ["cash", "USD", 0],
      ["credit_card", "ARS", -300_000],
      ["person", "ARS", 75_000],
      ["person", "USD", -15_000],
    ]);
  });

  it("returns zero totals and only the default cash for a new user", async () => {
    // Arrange
    const empty = await harness.signUpWithGoogle("empty@example.com");
    const cookie = await harness.cookieFor(empty);

    // Act
    const balance = await json(await call("GET", "/balance", cookie));

    // Assert
    expect(balance).toEqual({
      totals: [
        { currency: "ARS", totalMinor: 0 },
        { currency: "USD", totalMinor: 0 },
      ],
      lines: [
        expect.objectContaining({ type: "cash", currency: "ARS", balanceMinor: 0 }),
        expect.objectContaining({ type: "cash", currency: "USD", balanceMinor: 0 }),
      ],
    });
  });
});

describe("recurring movements", () => {
  async function recurringOn(userId: string, accountId: string, currency: string) {
    const group = await harness.pool.query(
      "insert into category_group (user_id, name) values ($1, 'g' || gen_random_uuid()) returning id",
      [userId],
    );
    const category = await harness.pool.query(
      "insert into category (user_id, type, group_id, name, color) values ($1, 'expense', $2, 'c' || gen_random_uuid(), 1) returning id",
      [userId, group.rows[0].id],
    );
    await harness.pool.query(
      "insert into recurring (user_id, type, frequency, day_of_month, amount_mode, amount_minor, currency, account_id, category_id, starts_on) values ($1, 'expense', 'monthly', 5, 'fixed', 1000, $2, $3, $4, '2026-01-01')",
      [userId, currency, accountId, category.rows[0].id],
    );
  }

  it("refuses to drop a currency used by a recurring movement and to delete the account", async () => {
    // Arrange
    const created = await json(
      await call("POST", "/accounts", cookieA, {
        type: "cash",
        name: "Scheduled",
        currencies: [
          { currency: "ARS", openingBalanceMinor: 0 },
          { currency: "USD", openingBalanceMinor: 0 },
        ],
      }),
    );
    await recurringOn(userA, created.id, "USD");

    // Act
    const drop = await call("PATCH", `/accounts/${created.id}`, cookieA, { currencies: pesos });
    const remove = await call("DELETE", `/accounts/${created.id}`, cookieA);

    // Assert
    expect(drop.status).toBe(409);
    expect(remove.status).toBe(409);
  });
});
