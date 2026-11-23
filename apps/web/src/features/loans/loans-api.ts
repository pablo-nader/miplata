import {
  type ForgiveRequest,
  type LoanDetail,
  type LoansResponse,
  loanDetailSchema,
  loansResponseSchema,
  type Movement,
  movementSchema,
} from "@miplata/shared";
import { failureOf, type MutationResult, readJson } from "../movements/movements-api";

export function fetchLoans(): Promise<LoansResponse> {
  return fetch("/api/loans").then((response) => readJson(response, loansResponseSchema));
}

export async function fetchLoanDetail(personId: string): Promise<LoanDetail | null> {
  const response = await fetch(`/api/loans/${personId}`);
  if (response.status === 404) {
    return null;
  }
  return readJson(response, loanDetailSchema);
}

export async function forgiveDebt(
  personId: string,
  request: ForgiveRequest,
): Promise<MutationResult<Movement>> {
  try {
    const response = await fetch(`/api/loans/${personId}/forgive`, {
      method: "POST",
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
