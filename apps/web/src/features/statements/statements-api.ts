import {
  type AdjustmentRequest,
  type BankFiguresRequest,
  type ChargeRequest,
  type StatementDatesRequest,
  type StatementDetail,
  type StatementPaymentRequest,
  type StatementSummary,
  statementDetailSchema,
  statementListSchema,
} from "@miplata/shared";

export type MutationResult<T> = { ok: true; value: T } | { ok: false; error: string };

async function readJson<T>(response: Response, schema: { parse(value: unknown): T }): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return schema.parse(await response.json());
}

export async function fetchStatements(accountId: string): Promise<StatementSummary[]> {
  const response = await fetch(`/api/statements?accountId=${accountId}`);
  return (await readJson(response, statementListSchema)).items;
}

export function fetchStatement(statementId: string): Promise<StatementDetail> {
  return fetch(`/api/statements/${statementId}`).then((response) =>
    readJson(response, statementDetailSchema),
  );
}

async function send(
  path: string,
  method: string,
  body?: unknown,
): Promise<MutationResult<StatementDetail>> {
  try {
    const response = await fetch(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        reason?: string;
      } | null;
      return { ok: false, error: payload?.reason ?? payload?.error ?? "unknown" };
    }
    return { ok: true, value: statementDetailSchema.parse(await response.json()) };
  } catch {
    return { ok: false, error: "network" };
  }
}

export function saveBankFigures(statementId: string, request: BankFiguresRequest) {
  return send(`/api/statements/${statementId}/bank-figures`, "PUT", request);
}

export function addCharge(statementId: string, request: ChargeRequest) {
  return send(`/api/statements/${statementId}/charges`, "POST", request);
}

export function editCharge(statementId: string, movementId: string, request: ChargeRequest) {
  return send(`/api/statements/${statementId}/charges/${movementId}`, "PUT", request);
}

export function removeCharge(statementId: string, movementId: string) {
  return send(`/api/statements/${statementId}/charges/${movementId}`, "DELETE");
}

export function payStatement(statementId: string, request: StatementPaymentRequest) {
  return send(`/api/statements/${statementId}/payments`, "POST", request);
}

export function adjustStatement(statementId: string, request: AdjustmentRequest) {
  return send(`/api/statements/${statementId}/adjustment`, "POST", request);
}

export function updateStatementDates(statementId: string, request: StatementDatesRequest) {
  return send(`/api/statements/${statementId}`, "PATCH", request);
}
