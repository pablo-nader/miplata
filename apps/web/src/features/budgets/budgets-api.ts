import {
  type Budget,
  type BudgetRequest,
  type BudgetsResponse,
  budgetSchema,
  budgetsResponseSchema,
  type YearMonth,
} from "@miplata/shared";

export type MutationResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function failureOf(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return payload?.error ?? "unknown";
}

export async function fetchBudgets(month: YearMonth, attention = false): Promise<BudgetsResponse> {
  const flag = attention ? "&attention=true" : "";
  const response = await fetch(`/api/budgets?month=${month}${flag}`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return budgetsResponseSchema.parse(await response.json());
}

async function save(
  path: string,
  method: "POST" | "PUT",
  body: BudgetRequest,
): Promise<MutationResult<Budget>> {
  try {
    const response = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { ok: false, error: await failureOf(response) };
    }
    return { ok: true, value: budgetSchema.parse(await response.json()) };
  } catch {
    return { ok: false, error: "network" };
  }
}

export function createBudget(body: BudgetRequest) {
  return save("/api/budgets", "POST", body);
}

export function updateBudget(id: string, body: BudgetRequest) {
  return save(`/api/budgets/${id}`, "PUT", body);
}

export async function deleteBudget(id: string): Promise<MutationResult<null>> {
  try {
    const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    return response.ok
      ? { ok: true, value: null }
      : { ok: false, error: await failureOf(response) };
  } catch {
    return { ok: false, error: "network" };
  }
}
