import {
  type ConfirmOccurrenceRequest,
  type EntryRequest,
  type IsoDate,
  type Movement,
  type OccurrenceList,
  type Recurring,
  type RecurringRequest,
  UPCOMING_DAYS,
} from "@miplata/shared";
import type { AccountRepository } from "../../accounts/application/accounts";
import type { CategoryRepository } from "../../categories/application/category-repository";
import type { MovementRepository } from "../../movements/application/movement-repository";
import {
  checkEntry,
  createMovementForOccurrence,
  type MovementDependencies,
  type MovementError,
} from "../../movements/application/movement-use-cases";
import { addDays, datesToGenerate, earlierOf } from "../domain/generation";
import type { RecurringRule } from "../domain/schedule";
import type { RecurringFields, RecurringRepository } from "./recurring-repository";

export type RecurringDependencies = {
  recurring: RecurringRepository;
  movements: MovementRepository;
  accounts: AccountRepository;
  categories: CategoryRepository;
  today: () => IsoDate;
};

export type RecurringError =
  | MovementError
  | "amount_required"
  | "recurring_ended"
  | "invalid_range";

export type RecurringResult<T> = { ok: true; value: T } | { ok: false; error: RecurringError };

function failure<T>(error: RecurringError): RecurringResult<T> {
  return { ok: false, error };
}

function movementDeps(deps: RecurringDependencies): MovementDependencies {
  return { movements: deps.movements, accounts: deps.accounts, categories: deps.categories };
}

function ruleOf(recurring: Recurring): RecurringRule {
  return {
    frequency: recurring.frequency,
    dayOfMonth: recurring.dayOfMonth,
    monthOfYear: recurring.monthOfYear ?? undefined,
    startsOn: recurring.startsOn,
    endsOn: recurring.endsOn,
    isPaused: recurring.isPaused,
  };
}

function fieldsOf(request: RecurringRequest): RecurringFields {
  return {
    ...request,
    monthOfYear: request.frequency === "yearly" ? Number(request.startsOn.slice(5, 7)) : null,
  };
}

function probeEntry(fields: RecurringFields): EntryRequest {
  return {
    type: fields.type,
    occurredOn: fields.startsOn,
    description: fields.description,
    categoryId: fields.categoryId,
    accountId: fields.accountId,
    currency: fields.currency,
    amountMinor: fields.amountMinor ?? 1,
    installments: 1,
    person: null,
  };
}

async function generate(
  deps: RecurringDependencies,
  userId: string,
  horizon: IsoDate,
  recurringId?: string,
  status: "pending" | "skipped" = "pending",
): Promise<void> {
  const candidates = await deps.recurring.generationCandidates(userId, recurringId);
  const rows = candidates.flatMap((candidate) =>
    datesToGenerate(ruleOf(candidate.recurring), candidate.latestDueOn, horizon).map((dueOn) => ({
      recurringId: candidate.recurring.id,
      dueOn,
      status,
    })),
  );
  await deps.recurring.insertOccurrences(userId, rows);
}

async function validate(
  deps: RecurringDependencies,
  userId: string,
  fields: RecurringFields,
  keepInactive: Set<string>,
): Promise<RecurringResult<RecurringFields>> {
  const violation = await checkEntry(movementDeps(deps), userId, probeEntry(fields), keepInactive);
  return violation ? failure(violation) : { ok: true, value: fields };
}

export function listRecurring(deps: RecurringDependencies, userId: string) {
  return deps.recurring.list(userId);
}

export async function getRecurring(
  deps: RecurringDependencies,
  userId: string,
  recurringId: string,
): Promise<RecurringResult<Recurring>> {
  const found = await deps.recurring.find(userId, recurringId);
  return found ? { ok: true, value: found } : failure("not_found");
}

export async function createRecurring(
  deps: RecurringDependencies,
  userId: string,
  request: RecurringRequest,
): Promise<RecurringResult<Recurring>> {
  const checked = await validate(deps, userId, fieldsOf(request), new Set());
  if (!checked.ok) {
    return checked;
  }
  return { ok: true, value: await deps.recurring.create(userId, checked.value) };
}

export async function updateRecurring(
  deps: RecurringDependencies,
  userId: string,
  recurringId: string,
  request: RecurringRequest,
): Promise<RecurringResult<Recurring>> {
  const existing = await deps.recurring.find(userId, recurringId);
  if (!existing) {
    return failure("not_found");
  }
  const kept = new Set([existing.accountId, existing.categoryId]);
  const checked = await validate(deps, userId, fieldsOf(request), kept);
  if (!checked.ok) {
    return checked;
  }
  const today = deps.today();
  await generate(deps, userId, today, recurringId);
  const updated = await deps.recurring.update(userId, recurringId, checked.value, today);
  if (!updated) {
    return failure("not_found");
  }
  await generate(deps, userId, today, recurringId, "skipped");
  return { ok: true, value: updated };
}

export async function pauseRecurring(
  deps: RecurringDependencies,
  userId: string,
  recurringId: string,
): Promise<RecurringResult<Recurring>> {
  const today = deps.today();
  await generate(deps, userId, today, recurringId);
  const paused = await deps.recurring.pause(userId, recurringId, today);
  return paused ? { ok: true, value: paused } : failure("not_found");
}

export async function resumeRecurring(
  deps: RecurringDependencies,
  userId: string,
  recurringId: string,
): Promise<RecurringResult<Recurring>> {
  const existing = await deps.recurring.find(userId, recurringId);
  if (!existing) {
    return failure("not_found");
  }
  const today = deps.today();
  if (existing.endsOn !== null && existing.endsOn <= today) {
    return failure("recurring_ended");
  }
  if (!existing.isPaused) {
    return { ok: true, value: existing };
  }
  const resumed = await deps.recurring.resume(userId, recurringId);
  if (!resumed) {
    return failure("not_found");
  }
  await generate(deps, userId, today, recurringId, "skipped");
  return { ok: true, value: resumed };
}

export async function endRecurring(
  deps: RecurringDependencies,
  userId: string,
  recurringId: string,
  endsOn: IsoDate | undefined,
): Promise<RecurringResult<Recurring>> {
  const existing = await deps.recurring.find(userId, recurringId);
  if (!existing) {
    return failure("not_found");
  }
  const today = deps.today();
  const last = endsOn ?? today;
  if (last < existing.startsOn) {
    return failure("invalid_range");
  }
  await generate(deps, userId, earlierOf(last, today), recurringId);
  const ended = await deps.recurring.end(userId, recurringId, last);
  return ended ? { ok: true, value: ended } : failure("not_found");
}

export async function listOccurrences(
  deps: RecurringDependencies,
  userId: string,
  type: "income" | "expense" | undefined,
): Promise<OccurrenceList> {
  const today = deps.today();
  const horizon = addDays(today, UPCOMING_DAYS);
  await generate(deps, userId, horizon);
  return { today, items: await deps.recurring.pendingOccurrences(userId, horizon, type) };
}

export async function confirmOccurrence(
  deps: RecurringDependencies,
  userId: string,
  occurrenceId: string,
  request: ConfirmOccurrenceRequest,
): Promise<RecurringResult<Movement>> {
  const stored = await deps.recurring.findOccurrence(userId, occurrenceId);
  if (!stored) {
    return failure("not_found");
  }
  if (stored.status !== "pending") {
    return failure("occurrence_resolved");
  }
  const { occurrence } = stored;
  const amountMinor =
    request.amountMinor ??
    (occurrence.amountMode === "fixed" ? occurrence.suggestedAmountMinor : null);
  if (amountMinor === null) {
    return failure("amount_required");
  }
  const entry: EntryRequest = {
    type: occurrence.type,
    occurredOn: request.occurredOn ?? occurrence.dueOn,
    description: occurrence.description,
    categoryId: occurrence.categoryId,
    accountId: request.accountId ?? occurrence.accountId,
    currency: occurrence.currency,
    amountMinor,
    installments: 1,
    person: null,
  };
  return createMovementForOccurrence(movementDeps(deps), userId, occurrenceId, entry);
}

export async function skipOccurrence(
  deps: RecurringDependencies,
  userId: string,
  occurrenceId: string,
): Promise<RecurringResult<null>> {
  const outcome = await deps.recurring.skip(userId, occurrenceId);
  if (outcome === "skipped") {
    return { ok: true, value: null };
  }
  return failure(outcome === "resolved" ? "occurrence_resolved" : "not_found");
}
