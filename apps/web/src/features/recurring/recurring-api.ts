import {
  type ConfirmOccurrenceRequest,
  type Movement,
  movementSchema,
  type Occurrence,
  type OccurrenceList,
  occurrenceListSchema,
  type Recurring,
  type RecurringList,
  type RecurringRequest,
  recurringListSchema,
  recurringSchema,
} from "@miplata/shared";
import { failureOf, type MutationResult, readJson } from "../movements/movements-api";

const JSON_HEADERS = { "content-type": "application/json" };

export function fetchRecurringList(): Promise<RecurringList> {
  return fetch("/api/recurring").then((response) => readJson(response, recurringListSchema));
}

export function fetchRecurring(id: string): Promise<Recurring> {
  return fetch(`/api/recurring/${id}`).then((response) => readJson(response, recurringSchema));
}

export function fetchOccurrences(type?: Occurrence["type"]): Promise<OccurrenceList> {
  const query = type ? `?type=${type}` : "";
  return fetch(`/api/recurring/occurrences${query}`).then((response) =>
    readJson(response, occurrenceListSchema),
  );
}

async function send<T>(
  url: string,
  init: RequestInit,
  parse: (response: Response) => Promise<T>,
): Promise<MutationResult<T>> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      return { ok: false, error: await failureOf(response) };
    }
    return { ok: true, value: await parse(response) };
  } catch {
    return { ok: false, error: "network" };
  }
}

const parseRecurring = async (response: Response) => recurringSchema.parse(await response.json());
const ignoreBody = async () => null;

export function saveRecurring(
  id: string | null,
  request: RecurringRequest,
): Promise<MutationResult<Recurring>> {
  return send(
    id ? `/api/recurring/${id}` : "/api/recurring",
    { method: id ? "PUT" : "POST", headers: JSON_HEADERS, body: JSON.stringify(request) },
    parseRecurring,
  );
}

export function pauseRecurring(id: string): Promise<MutationResult<Recurring>> {
  return send(`/api/recurring/${id}/pause`, { method: "POST" }, parseRecurring);
}

export function resumeRecurring(id: string): Promise<MutationResult<Recurring>> {
  return send(`/api/recurring/${id}/resume`, { method: "POST" }, parseRecurring);
}

export function endRecurring(id: string): Promise<MutationResult<Recurring>> {
  return send(
    `/api/recurring/${id}/end`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({}) },
    parseRecurring,
  );
}

export function confirmOccurrence(
  id: string,
  request: ConfirmOccurrenceRequest,
): Promise<MutationResult<Movement>> {
  return send(
    `/api/recurring/occurrences/${id}/confirm`,
    { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(request) },
    async (response) => movementSchema.parse(await response.json()),
  );
}

export function skipOccurrence(id: string): Promise<MutationResult<null>> {
  return send(`/api/recurring/occurrences/${id}/skip`, { method: "POST" }, ignoreBody);
}
