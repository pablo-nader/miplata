import type { CategoryDto, EntryRequest, MovementRequest } from "@miplata/shared";
import { beforeEach, describe, expect, it } from "vitest";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { inMemoryAccounts } from "../../test/account-fakes";
import { inMemoryMovements } from "../../test/movement-fakes";
import {
  createMovement,
  deleteMovement,
  getMonthSummary,
  getMovement,
  listMovements,
  type MovementDependencies,
  updateMovement,
} from "./movement-use-cases";

const USER = "user-a";
const OTHER = "user-b";
const CATEGORY = "00000000-0000-4000-8000-000000000009";

const category: CategoryDto = {
  id: CATEGORY,
  type: "expense",
  groupId: null,
  nameKey: null,
  name: "Food",
  icon: null,
  color: 1,
  isActive: true,
  sortOrder: 0,
};

let deps: MovementDependencies;
let cashId: string;
let juanId: string;
let movements: ReturnType<typeof inMemoryMovements>;

function expense(overrides: Partial<EntryRequest> = {}): EntryRequest {
  return {
    type: "expense",
    occurredOn: "2026-11-10",
    description: null,
    categoryId: CATEGORY,
    accountId: cashId,
    currency: "ARS",
    amountMinor: 500_00,
    installments: 1,
    person: null,
    ...overrides,
  };
}

beforeEach(async () => {
  const accounts = inMemoryAccounts();
  movements = inMemoryMovements();
  const cash = await accounts.repository.create(USER, {
    type: "cash",
    institutionId: null,
    name: "Cash",
    closingDay: null,
    dueDay: null,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
  });
  const juan = await accounts.repository.create(USER, {
    type: "person",
    institutionId: null,
    name: "Juan",
    closingDay: null,
    dueDay: null,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
  });
  cashId = cash.id;
  juanId = juan.id;
  deps = {
    movements: movements.repository,
    accounts: accounts.repository,
    categories: {
      findCategory: async (_userId: string, id: string) => (id === CATEGORY ? category : null),
    } as CategoryRepository,
  };
});

describe("creating movements", () => {
  it("creates an expense for the user", async () => {
    // Arrange
    const request = expense();

    // Act
    const result = await createMovement(deps, USER, request);

    // Assert
    expect(result).toMatchObject({ ok: true, value: { type: "expense" } });
  });

  it.each([
    [
      "an unknown account",
      { accountId: "00000000-0000-4000-8000-0000000000ff" },
      "account_not_found",
    ],
    [
      "an unknown category",
      { categoryId: "00000000-0000-4000-8000-0000000000ff" },
      "category_not_found",
    ],
    [
      "an unknown person",
      { person: { personId: "00000000-0000-4000-8000-0000000000ff", ownAmountMinor: 0 } },
      "person_not_found",
    ],
  ] as const)("fails with %s", async (_label, changes, error) => {
    // Arrange
    const request = expense(changes as Partial<EntryRequest>);

    // Act
    const result = await createMovement(deps, USER, request);

    // Assert
    expect(result).toEqual({ ok: false, error });
  });

  it("does not see another user's account", async () => {
    // Arrange
    const request = expense();

    // Act
    const result = await createMovement(deps, OTHER, request);

    // Assert
    expect(result).toEqual({ ok: false, error: "account_not_found" });
  });

  it("fails a transfer with an unknown account", async () => {
    // Arrange
    const request: MovementRequest = {
      type: "transfer",
      occurredOn: "2026-11-10",
      description: null,
      from: { accountId: cashId, currency: "ARS", amountMinor: 1_00 },
      to: { accountId: "00000000-0000-4000-8000-0000000000ff", currency: "ARS", amountMinor: 1_00 },
    };

    // Act
    const result = await createMovement(deps, USER, request);

    // Assert
    expect(result).toEqual({ ok: false, error: "account_not_found" });
  });

  it("creates a purchase for another person", async () => {
    // Arrange
    const request = expense({ person: { personId: juanId, ownAmountMinor: 0 } });

    // Act
    const result = await createMovement(deps, USER, request);

    // Assert
    expect(result).toMatchObject({ ok: true, value: { person: { personId: juanId } } });
  });
});

describe("updating, reading, listing and deleting", () => {
  it("replaces a movement and keeps its id", async () => {
    // Arrange
    const created = await createMovement(deps, USER, expense());
    const id = created.ok ? created.value.id : "";

    // Act
    const result = await updateMovement(deps, USER, id, expense({ amountMinor: 900_00 }));

    // Assert
    expect(result).toMatchObject({ ok: true, value: { id, account: { amountMinor: 900_00 } } });
  });

  it("reports an update of a missing movement as not found", async () => {
    // Arrange
    const id = "00000000-0000-4000-8000-0000000000ff";

    // Act
    const result = await updateMovement(deps, USER, id, expense());

    // Assert
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("surfaces planning violations on update", async () => {
    // Arrange
    const created = await createMovement(deps, USER, expense());
    const id = created.ok ? created.value.id : "";

    // Act
    const result = await updateMovement(deps, USER, id, expense({ installments: 3 }));

    // Assert
    expect(result).toEqual({ ok: false, error: "installments_not_allowed" });
  });

  it("reads and lists only the owner's movements", async () => {
    // Arrange
    const created = await createMovement(deps, USER, expense());
    const id = created.ok ? created.value.id : "";

    // Act
    const own = await getMovement(movements.repository, USER, id);
    const foreign = await getMovement(movements.repository, OTHER, id);
    const page = await listMovements(movements.repository, USER, { limit: 50, offset: 0 });

    // Assert
    expect(own.ok).toBe(true);
    expect(foreign).toEqual({ ok: false, error: "not_found" });
    expect(page.items).toHaveLength(1);
  });

  it("deletes a movement once", async () => {
    // Arrange
    const created = await createMovement(deps, USER, expense());
    const id = created.ok ? created.value.id : "";

    // Act
    const first = await deleteMovement(movements.repository, USER, id);
    const second = await deleteMovement(movements.repository, USER, id);

    // Assert
    expect(first).toEqual({ ok: true, value: null });
    expect(second).toEqual({ ok: false, error: "not_found" });
  });

  it("maps a blocked deletion to movement_in_use", async () => {
    // Arrange
    const blocked = { ...movements.repository, remove: async () => "in_use" as const };

    // Act
    const result = await deleteMovement(blocked, USER, "any");

    // Assert
    expect(result).toEqual({ ok: false, error: "movement_in_use" });
  });
});

describe("month summary", () => {
  it("wraps the repository rows into per-currency totals", async () => {
    // Arrange
    const repository = {
      ...movements.repository,
      monthRows: async () => [
        { currency: "ARS" as const, type: "expense" as const, totalMinor: 7 },
      ],
    };

    // Act
    const summary = await getMonthSummary(repository, USER, "2026-11");

    // Assert
    expect(summary).toEqual({
      month: "2026-11",
      totals: [
        { currency: "ARS", inMinor: 0, outMinor: 7 },
        { currency: "USD", inMinor: 0, outMinor: 0 },
      ],
    });
  });
});
