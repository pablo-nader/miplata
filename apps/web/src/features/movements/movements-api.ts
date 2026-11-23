import {
  type MonthSummary,
  type Movement,
  type MovementList,
  type MovementQuery,
  type MovementRequest,
  monthSummarySchema,
  movementListSchema,
  movementSchema,
} from "@miplata/shared";

export type MovementFilters = Partial<
  Omit<MovementQuery, "limit" | "offset" | "minAmountMinor" | "maxAmountMinor">
> & { minAmountMinor?: number; maxAmountMinor?: number };

export type MutationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export const PAGE_SIZE = 30;

function queryString(filters: MovementFilters, limit: number, offset: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  }
  params.set("limit", String(limit));
  params.set("offset", String(offset));
  return params.toString();
}

export async function readJson<T>(
  response: Response,
  schema: { parse(value: unknown): T },
): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return schema.parse(await response.json());
}

export function fetchMovements(
  filters: MovementFilters,
  limit = PAGE_SIZE,
  offset = 0,
): Promise<MovementList> {
  return fetch(`/api/movements?${queryString(filters, limit, offset)}`).then((response) =>
    readJson(response, movementListSchema),
  );
}

export function fetchMovement(id: string): Promise<Movement> {
  return fetch(`/api/movements/${id}`).then((response) => readJson(response, movementSchema));
}

export function fetchMonthSummary(month: string): Promise<MonthSummary> {
  return fetch(`/api/movements/summary?month=${month}`).then((response) =>
    readJson(response, monthSummarySchema),
  );
}

export async function failureOf(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => null)) as {
    error?: string;
    reason?: string;
  } | null;
  return payload?.reason ?? payload?.error ?? "unknown";
}

export async function saveMovement(
  id: string | null,
  request: MovementRequest,
): Promise<MutationResult<Movement>> {
  try {
    const response = await fetch(id ? `/api/movements/${id}` : "/api/movements", {
      method: id ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      return { ok: false, error: await failureOf(response) };
    }
    return { ok: true, value: movementSchema.parse(await response.json()) };
  } catch {
    return { ok: false, error: "network" };
  }
}

export async function deleteMovement(id: string): Promise<MutationResult<null>> {
  try {
    const response = await fetch(`/api/movements/${id}`, { method: "DELETE" });
    return response.ok
      ? { ok: true, value: null }
      : { ok: false, error: await failureOf(response) };
  } catch {
    return { ok: false, error: "network" };
  }
}
