import {
  type Account,
  addMonths,
  type CategoryDto,
  type EntryRequest,
  type MonthSummary,
  type Movement,
  type MovementQuery,
  type MovementRequest,
  monthOf,
  type TransferRequest,
  type YearMonth,
} from "@miplata/shared";
import type { AccountRepository } from "../../accounts/application/accounts";
import type { CategoryRepository } from "../../categories/application/category-repository";
import type { StatementOverrides } from "../../statements/domain/statement-assignment";
import { monthTotals } from "../domain/month-summary";
import {
  type MovementPlan,
  type MovementViolation,
  type PlanOutcome,
  planEntry,
  planTransfer,
} from "../domain/movement-plan";
import type { MovementPage, MovementRepository } from "./movement-repository";

export type MovementDependencies = {
  movements: MovementRepository;
  accounts: AccountRepository;
  categories: CategoryRepository;
};

export type MovementError =
  | MovementViolation
  | "not_found"
  | "movement_in_use"
  | "statement_movement"
  | "occurrence_resolved";

export type MovementResult<T> = { ok: true; value: T } | { ok: false; error: MovementError };

function failure<T>(error: MovementError): MovementResult<T> {
  return { ok: false, error };
}

function keptReferences(existing: Movement | null): Set<string> {
  if (!existing) {
    return new Set();
  }
  const ids = [
    existing.categoryId,
    existing.account?.accountId,
    existing.from?.accountId,
    existing.to?.accountId,
    existing.person?.personId,
  ];
  return new Set(ids.filter((id): id is string => typeof id === "string"));
}

async function planFromEntry(
  deps: MovementDependencies,
  userId: string,
  request: EntryRequest,
  keepInactive: Set<string>,
): Promise<MovementResult<MovementPlan>> {
  const [account, person, category] = await Promise.all([
    deps.accounts.find(userId, request.accountId),
    request.person ? deps.accounts.find(userId, request.person.personId) : null,
    deps.categories.findCategory(userId, request.categoryId),
  ]);
  if (!account) {
    return failure("account_not_found");
  }
  if (!category) {
    return failure("category_not_found");
  }
  if (request.person && !person) {
    return failure("person_not_found");
  }
  const overrides = await statementOverridesFor(deps, userId, account, request);
  return outcome(planEntry(request, refsOf(account, person, category, keepInactive), overrides));
}

function refsOf(
  account: Account,
  person: Account | null,
  category: CategoryDto,
  keepInactive: Set<string>,
) {
  return { account, person, category, keepInactive };
}

async function statementOverridesFor(
  deps: MovementDependencies,
  userId: string,
  account: Account,
  request: EntryRequest,
): Promise<StatementOverrides> {
  if (account.type !== "credit_card" || request.type !== "expense") {
    return {};
  }
  const first = monthOf(request.occurredOn);
  const last: YearMonth = addMonths(first, request.installments + 1);
  return deps.movements.statementOverrides(userId, account.id, first, last);
}

async function planFromTransfer(
  deps: MovementDependencies,
  userId: string,
  request: TransferRequest,
  keepInactive: Set<string>,
): Promise<MovementResult<MovementPlan>> {
  const [from, to] = await Promise.all([
    deps.accounts.find(userId, request.from.accountId),
    deps.accounts.find(userId, request.to.accountId),
  ]);
  if (!from || !to) {
    return failure("account_not_found");
  }
  return outcome(planTransfer(request, { from, to, keepInactive }));
}

function outcome(planned: PlanOutcome): MovementResult<MovementPlan> {
  return planned.ok ? { ok: true, value: planned.plan } : failure(planned.violation);
}

function planFor(
  deps: MovementDependencies,
  userId: string,
  request: MovementRequest,
  existing: Movement | null,
) {
  const keepInactive = keptReferences(existing);
  return request.type === "transfer"
    ? planFromTransfer(deps, userId, request, keepInactive)
    : planFromEntry(deps, userId, request, keepInactive);
}

export async function createMovement(
  deps: MovementDependencies,
  userId: string,
  request: MovementRequest,
): Promise<MovementResult<Movement>> {
  const planned = await planFor(deps, userId, request, null);
  if (!planned.ok) {
    return planned;
  }
  return { ok: true, value: await deps.movements.create(userId, planned.value) };
}

export async function checkEntry(
  deps: MovementDependencies,
  userId: string,
  request: EntryRequest,
  keepInactive: Set<string>,
): Promise<MovementError | null> {
  const planned = await planFromEntry(deps, userId, request, keepInactive);
  return planned.ok ? null : planned.error;
}

export async function createMovementForOccurrence(
  deps: MovementDependencies,
  userId: string,
  occurrenceId: string,
  request: EntryRequest,
): Promise<MovementResult<Movement>> {
  const planned = await planFromEntry(deps, userId, request, new Set());
  if (!planned.ok) {
    return planned;
  }
  const created = await deps.movements.createForOccurrence(userId, occurrenceId, planned.value);
  return created === "not_pending" ? failure("occurrence_resolved") : { ok: true, value: created };
}

export async function updateMovement(
  deps: MovementDependencies,
  userId: string,
  movementId: string,
  request: MovementRequest,
): Promise<MovementResult<Movement>> {
  const existing = await deps.movements.find(userId, movementId);
  if (!existing) {
    return failure("not_found");
  }
  if (await deps.movements.isStatementBound(userId, movementId)) {
    return failure("statement_movement");
  }
  const planned = await planFor(deps, userId, request, existing);
  if (!planned.ok) {
    return planned;
  }
  const replaced = await deps.movements.replace(userId, movementId, planned.value);
  return replaced ? { ok: true, value: replaced } : failure("not_found");
}

export async function getMovement(
  movements: MovementRepository,
  userId: string,
  movementId: string,
): Promise<MovementResult<Movement>> {
  const found = await movements.find(userId, movementId);
  return found ? { ok: true, value: found } : failure("not_found");
}

export async function deleteMovement(
  movements: MovementRepository,
  userId: string,
  movementId: string,
): Promise<MovementResult<null>> {
  const removed = await movements.remove(userId, movementId);
  if (removed === "deleted") {
    return { ok: true, value: null };
  }
  return failure(removed === "in_use" ? "movement_in_use" : "not_found");
}

export function listMovements(
  movements: MovementRepository,
  userId: string,
  query: MovementQuery,
): Promise<MovementPage> {
  return movements.list(userId, query);
}

export async function getMonthSummary(
  movements: MovementRepository,
  userId: string,
  month: YearMonth,
): Promise<MonthSummary> {
  return { month, totals: monthTotals(await movements.monthRows(userId, month)) };
}
