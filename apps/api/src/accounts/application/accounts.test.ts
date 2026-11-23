import type { Institution } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { createPerson, updatePerson } from "../../people/application/people";
import { inMemoryAccounts, inMemoryInstitutions } from "../../test/account-fakes";
import {
  createAccount,
  deleteAccount,
  getAccount,
  setAccountActive,
  updateAccount,
} from "./accounts";
import { getBalance } from "./get-balance";

const galicia: Institution = { id: "inst-1", kind: "bank", name: "Galicia", logoPath: null };

function setup() {
  const store = inMemoryAccounts();
  const institutions = inMemoryInstitutions([galicia]);
  return { ...store, institutions, accounts: store.repository };
}

const cashDraft = {
  type: "cash" as const,
  institutionId: null,
  name: "Wallet",
  closingDay: null,
  dueDay: null,
  currencies: [{ currency: "ARS" as const, openingBalanceMinor: 5_000 }],
};

describe("createAccount", () => {
  it("stores a valid account for the user", async () => {
    // Arrange
    const { accounts, institutions } = setup();

    // Act
    const result = await createAccount(accounts, institutions, "user-a", cashDraft);

    // Assert
    expect(result).toMatchObject({ ok: true, value: { name: "Wallet", type: "cash" } });
    expect(await accounts.list("user-a")).toHaveLength(1);
    expect(await accounts.list("user-b")).toHaveLength(0);
  });

  it("returns the violation and stores nothing for an invalid account", async () => {
    // Arrange
    const { accounts, institutions } = setup();

    // Act
    const result = await createAccount(accounts, institutions, "user-a", {
      ...cashDraft,
      name: null,
    });

    // Assert
    expect(result).toEqual({ ok: false, error: "name_required" });
    expect(await accounts.list("user-a")).toHaveLength(0);
  });
});

describe("updateAccount", () => {
  it("changes the name and keeps the rest", async () => {
    // Arrange
    const { accounts, institutions } = setup();
    const created = await createAccount(accounts, institutions, "user-a", cashDraft);
    const id = created.ok ? created.value.id : "";

    // Act
    const result = await updateAccount(accounts, institutions, "user-a", id, { name: "Pocket" });

    // Assert
    expect(result).toMatchObject({ ok: true, value: { name: "Pocket", type: "cash" } });
  });

  it("does not let another user update the account", async () => {
    // Arrange
    const { accounts, institutions } = setup();
    const created = await createAccount(accounts, institutions, "user-a", cashDraft);
    const id = created.ok ? created.value.id : "";

    // Act
    const result = await updateAccount(accounts, institutions, "user-b", id, { name: "Mine" });

    // Assert
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("refuses to drop a currency that has postings", async () => {
    // Arrange
    const { accounts, institutions, post } = setup();
    const created = await createAccount(accounts, institutions, "user-a", {
      ...cashDraft,
      currencies: [
        { currency: "ARS", openingBalanceMinor: 0 },
        { currency: "USD", openingBalanceMinor: 0 },
      ],
    });
    const id = created.ok ? created.value.id : "";
    post(id, "USD", 100);

    // Act
    const result = await updateAccount(accounts, institutions, "user-a", id, {
      currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    });

    // Assert
    expect(result).toEqual({ ok: false, error: "currency_in_use" });
  });

  it("allows dropping a currency without postings", async () => {
    // Arrange
    const { accounts, institutions } = setup();
    const created = await createAccount(accounts, institutions, "user-a", {
      ...cashDraft,
      currencies: [
        { currency: "ARS", openingBalanceMinor: 0 },
        { currency: "USD", openingBalanceMinor: 0 },
      ],
    });
    const id = created.ok ? created.value.id : "";

    // Act
    const result = await updateAccount(accounts, institutions, "user-a", id, {
      currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    });

    // Assert
    expect(result).toMatchObject({ ok: true, value: { currencies: [{ currency: "ARS" }] } });
  });
});

describe("deleteAccount and setAccountActive", () => {
  it("deletes an account without postings", async () => {
    // Arrange
    const { accounts, institutions } = setup();
    const created = await createAccount(accounts, institutions, "user-a", cashDraft);
    const id = created.ok ? created.value.id : "";

    // Act
    const result = await deleteAccount(accounts, "user-a", id);

    // Assert
    expect(result).toEqual({ ok: true, value: null });
    expect(await getAccount(accounts, "user-a", id)).toEqual({ ok: false, error: "not_found" });
  });

  it("refuses to delete an account that has postings", async () => {
    // Arrange
    const { accounts, institutions, post } = setup();
    const created = await createAccount(accounts, institutions, "user-a", cashDraft);
    const id = created.ok ? created.value.id : "";
    post(id, "ARS", -100);

    // Act
    const result = await deleteAccount(accounts, "user-a", id);

    // Assert
    expect(result).toEqual({ ok: false, error: "account_in_use" });
  });

  it("deactivates and reactivates", async () => {
    // Arrange
    const { accounts, institutions } = setup();
    const created = await createAccount(accounts, institutions, "user-a", cashDraft);
    const id = created.ok ? created.value.id : "";

    // Act
    const off = await setAccountActive(accounts, "user-a", id, false);
    const on = await setAccountActive(accounts, "user-a", id, true);

    // Assert
    expect(off).toMatchObject({ ok: true, value: { isActive: false } });
    expect(on).toMatchObject({ ok: true, value: { isActive: true } });
  });
});

describe("people", () => {
  it("creates and renames a person", async () => {
    // Arrange
    const { accounts } = setup();

    // Act
    const created = await createPerson(accounts, "user-a", {
      name: "Juan",
      currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
    });
    const id = created.ok ? created.value.id : "";
    const renamed = await updatePerson(accounts, "user-a", id, { name: "Juan P." });

    // Assert
    expect(created).toMatchObject({ ok: true, value: { type: "person" } });
    expect(renamed).toMatchObject({ ok: true, value: { name: "Juan P." } });
  });
});

describe("getBalance", () => {
  it("totals active accounts per currency", async () => {
    // Arrange
    const { accounts, institutions, post } = setup();
    const created = await createAccount(accounts, institutions, "user-a", cashDraft);
    post(created.ok ? created.value.id : "", "ARS", -1_000);

    // Act
    const balance = await getBalance(accounts, "user-a");

    // Assert
    expect(balance.totals).toEqual([
      { currency: "ARS", totalMinor: 4_000 },
      { currency: "USD", totalMinor: 0 },
    ]);
    expect(balance.lines).toHaveLength(1);
  });
});
