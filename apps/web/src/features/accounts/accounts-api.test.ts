import { afterEach, describe, expect, it, vi } from "vitest";
import { makeAccount, stubApi } from "../../test/fake-api";
import {
  createAccount,
  deleteAccount,
  fetchAccounts,
  setAccountActive,
  updateAccount,
} from "./accounts-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

const body = { name: "Pocket", currencies: [{ currency: "ARS" as const, openingBalanceMinor: 0 }] };

describe("accounts api", () => {
  it("merges accounts and people into one list", async () => {
    // Arrange
    stubApi({
      "GET /api/accounts": { body: [makeAccount({ id: "a" })] },
      "GET /api/people": { body: [makeAccount({ id: "p", type: "person" })] },
    });

    // Act
    const list = await fetchAccounts();

    // Assert
    expect(list.map((item) => item.id)).toEqual(["a", "p"]);
  });

  it("rejects the list when the server answers with an error", async () => {
    // Arrange
    stubApi({});

    // Act
    const load = fetchAccounts();

    // Assert
    await expect(load).rejects.toThrow();
  });

  it("reports server errors by their code", async () => {
    // Arrange
    stubApi({ "POST /api/accounts": { status: 409, body: { error: "account_in_use" } } });

    // Act
    const result = await createAccount({ kind: "account", body: { type: "cash", ...body } });

    // Assert
    expect(result).toEqual({ ok: false, error: "account_in_use" });
  });

  it("reports a network failure", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    // Act
    const results = await Promise.all([
      createAccount({ kind: "person", body }),
      updateAccount("1", { kind: "person", body: { name: "x" } }),
      setAccountActive("account", "1", false),
      deleteAccount("account", "1"),
    ]);

    // Assert
    expect(results).toEqual(Array(4).fill({ ok: false, error: "network" }));
  });

  it("falls back to an unknown error when the failure has no body", async () => {
    // Arrange
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("oops", { status: 500 })));

    // Act
    const results = await Promise.all([
      setAccountActive("person", "1", true),
      deleteAccount("person", "1"),
    ]);

    // Assert
    expect(results).toEqual(Array(2).fill({ ok: false, error: "unknown" }));
  });
});
