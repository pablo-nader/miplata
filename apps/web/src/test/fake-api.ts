import type { Account, BalanceResponse, Institution } from "@miplata/shared";
import { vi } from "vitest";

type Reply = { status?: number; body?: unknown };
type Handler = Reply | ((body: unknown) => Reply);

export type RecordedCall = { key: string; body: unknown };

export function stubApi(handlers: Record<string, Handler>) {
  const calls: RecordedCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const key = method + " " + String(input);
      const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
      calls.push({ key, body });
      const handler = handlers[key];
      const reply = typeof handler === "function" ? handler(body) : handler;
      const status = reply?.status ?? (reply ? 200 : 404);
      if (status === 204) {
        return new Response(null, { status });
      }
      return new Response(JSON.stringify(reply?.body ?? { error: "not_found" }), {
        status,
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return { calls };
}

export const emptyBalance: BalanceResponse = {
  totals: [
    { currency: "ARS", totalMinor: 0 },
    { currency: "USD", totalMinor: 0 },
  ],
  lines: [],
};

export function stubEmptyApi() {
  return stubApi({
    "GET /api/accounts": { body: [] },
    "GET /api/people": { body: [] },
    "GET /api/institutions": { body: [] },
    "GET /api/balance": { body: emptyBalance },
  });
}

export const galicia: Institution = {
  id: "11111111-1111-4111-8111-111111111111",
  kind: "bank",
  name: "Galicia",
  logoPath: null,
};

export const mercadoPago: Institution = {
  id: "22222222-2222-4222-8222-222222222222",
  kind: "wallet",
  name: "Mercado Pago",
  logoPath: null,
};

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: "acc-1",
    type: "cash",
    name: "Pocket",
    nameKey: null,
    institution: null,
    closingDay: null,
    dueDay: null,
    isActive: true,
    canDelete: true,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0, balanceMinor: 0 }],
    ...overrides,
  };
}
