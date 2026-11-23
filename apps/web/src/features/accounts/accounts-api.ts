import {
  type Account,
  accountSchema,
  accountsResponseSchema,
  type BalanceResponse,
  balanceResponseSchema,
  type Institution,
  institutionsResponseSchema,
} from "@miplata/shared";
import type { CreateSubmission, UpdateSubmission } from "./account-form";

type Parser<T> = { parse(value: unknown): T };

export type AccountKind = "account" | "person";

export type MutationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const basePath: Record<AccountKind, string> = { account: "/api/accounts", person: "/api/people" };

async function readJson<T>(response: Response, schema: Parser<T>): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return schema.parse(await response.json());
}

async function mutate<T>(
  path: string,
  method: string,
  schema: Parser<T>,
  body?: unknown,
): Promise<MutationResult<T>> {
  try {
    const response = await fetch(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: payload?.error ?? "unknown" };
    }
    return { ok: true, value: schema.parse(await response.json()) };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function fetchAccounts(): Promise<Account[]> {
  const [accounts, people] = await Promise.all([
    fetch(basePath.account).then((response) => readJson(response, accountsResponseSchema)),
    fetch(basePath.person).then((response) => readJson(response, accountsResponseSchema)),
  ]);
  return [...accounts, ...people];
}

export function fetchInstitutions(): Promise<Institution[]> {
  return fetch("/api/institutions").then((response) =>
    readJson(response, institutionsResponseSchema),
  );
}

export function fetchBalance(): Promise<BalanceResponse> {
  return fetch("/api/balance").then((response) => readJson(response, balanceResponseSchema));
}

export function createAccount(submission: CreateSubmission) {
  return mutate(basePath[submission.kind], "POST", accountSchema, submission.body);
}

export function updateAccount(id: string, submission: UpdateSubmission) {
  return mutate(`${basePath[submission.kind]}/${id}`, "PATCH", accountSchema, submission.body);
}

export function setAccountActive(kind: AccountKind, id: string, isActive: boolean) {
  const action = isActive ? "reactivate" : "deactivate";
  return mutate(`${basePath[kind]}/${id}/${action}`, "POST", accountSchema);
}

export async function deleteAccount(kind: AccountKind, id: string): Promise<MutationResult<null>> {
  try {
    const response = await fetch(`${basePath[kind]}/${id}`, { method: "DELETE" });
    if (response.ok) {
      return { ok: true, value: null };
    }
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    return { ok: false, error: payload?.error ?? "unknown" };
  } catch {
    return { ok: false, error: "network" };
  }
}
