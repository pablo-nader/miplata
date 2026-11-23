import {
  type Account,
  ADJUSTMENT_CATEGORY_KEY,
  type AdjustmentRequest,
  type BankFiguresRequest,
  type CategoryDto,
  type ChargeRequest,
  type Currency,
  FINANCIAL_CHARGES_GROUP_KEY,
  type IsoDate,
  type StatementDatesRequest,
  type StatementDetail,
  type StatementPaymentRequest,
  type StatementSummary,
} from "@miplata/shared";
import type { AccountRepository } from "../../accounts/application/accounts";
import type { CategoryRepository } from "../../categories/application/category-repository";
import type { MovementRepository } from "../../movements/application/movement-repository";
import {
  planCharge,
  planPayment,
  type StatementTarget,
  type StatementViolation,
} from "../domain/statement-plans";
import {
  checkStatementDates,
  type StatementRow,
  summarizeStatements,
} from "../domain/statement-summary";
import type { CardSchedule, StatementRepository } from "./statement-repository";

export type StatementDependencies = {
  statements: StatementRepository;
  movements: MovementRepository;
  accounts: AccountRepository;
  categories: CategoryRepository;
  today: () => IsoDate;
};

export type StatementError = StatementViolation | "not_found";

export type StatementResult<T> = { ok: true; value: T } | { ok: false; error: StatementError };

function failure<T>(error: StatementError): StatementResult<T> {
  return { ok: false, error };
}

function success<T>(value: T): StatementResult<T> {
  return { ok: true, value };
}

type Loaded = { row: StatementRow; card: Account };

function scheduleOf(card: Account): CardSchedule | null {
  if (card.closingDay === null || card.dueDay === null) {
    return null;
  }
  return { accountId: card.id, closingDay: card.closingDay, dueDay: card.dueDay };
}

function targetOf(row: StatementRow): StatementTarget {
  return { id: row.id, periodMonth: row.periodMonth, closingDate: row.closingDate };
}

async function load(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
): Promise<Loaded | null> {
  const row = await deps.statements.find(userId, statementId);
  if (!row) {
    return null;
  }
  const card = await deps.accounts.find(userId, row.accountId);
  return card ? { row, card } : null;
}

async function summariesOf(
  deps: StatementDependencies,
  userId: string,
  card: Account,
): Promise<StatementSummary[]> {
  const [rows, lines] = await Promise.all([
    deps.statements.rows(userId, card.id),
    deps.statements.amountLines(userId, card.id),
  ]);
  const openingDebtMinor: Record<Currency, number> = { ARS: 0, USD: 0 };
  for (const entry of card.currencies) {
    openingDebtMinor[entry.currency] = -entry.openingBalanceMinor;
  }
  return summarizeStatements({
    statements: rows,
    lines,
    currencies: card.currencies.map((entry) => entry.currency),
    openingDebtMinor,
  });
}

function adjustmentCategoryOf(categories: readonly CategoryDto[]): CategoryDto | null {
  return categories.find((item) => item.nameKey === ADJUSTMENT_CATEGORY_KEY) ?? null;
}

async function detailOf(
  deps: StatementDependencies,
  userId: string,
  loaded: Loaded,
): Promise<StatementDetail> {
  const [summaries, lines, categories] = await Promise.all([
    summariesOf(deps, userId, loaded.card),
    deps.statements.detailLines(userId, loaded.row.id),
    deps.categories.listCategories(userId),
  ]);
  const summary = summaries.find((item) => item.id === loaded.row.id) as StatementSummary;
  const adjustment = adjustmentCategoryOf(categories);
  return {
    ...summary,
    purchases: lines.purchases,
    others: lines.others,
    charges: lines.charges.map((line) => ({
      ...line,
      isAdjustment: adjustment !== null && line.categoryId === adjustment.id,
    })),
    payments: lines.payments,
  };
}

async function respond(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  return loaded ? success(await detailOf(deps, userId, loaded)) : failure("not_found");
}

export async function listStatements(
  deps: StatementDependencies,
  userId: string,
  accountId: string,
): Promise<StatementResult<StatementSummary[]>> {
  const card = await deps.accounts.find(userId, accountId);
  if (card?.type !== "credit_card") {
    return failure("not_found");
  }
  const schedule = scheduleOf(card);
  if (schedule && card.isActive) {
    await deps.statements.ensureOpen(userId, schedule, deps.today());
  }
  return success(await summariesOf(deps, userId, card));
}

export function getStatement(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
): Promise<StatementResult<StatementDetail>> {
  return respond(deps, userId, statementId);
}

export async function updateStatementDates(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
  request: StatementDatesRequest,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  if (!loaded) {
    return failure("not_found");
  }
  const violation = checkStatementDates(
    loaded.row.periodMonth,
    request.closingDate,
    request.dueDate,
  );
  if (violation) {
    return failure(violation);
  }
  const schedule = scheduleOf(loaded.card);
  if (!schedule) {
    return failure("card_without_schedule");
  }
  await deps.statements.updateDates(userId, statementId, request, schedule);
  return respond(deps, userId, statementId);
}

export async function setBankFigures(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
  request: BankFiguresRequest,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  if (!loaded) {
    return failure("not_found");
  }
  const held = new Set(loaded.card.currencies.map((entry) => entry.currency));
  const usesMissingCurrency =
    (!held.has("ARS") &&
      (request.bankTotalArsMinor !== null || request.minimumArsMinor !== null)) ||
    (!held.has("USD") && (request.bankTotalUsdMinor !== null || request.minimumUsdMinor !== null));
  if (usesMissingCurrency) {
    return failure("currency_not_in_account");
  }
  await deps.statements.setBankFigures(userId, statementId, request);
  return respond(deps, userId, statementId);
}

async function chargeReferences(deps: StatementDependencies, userId: string, categoryId: string) {
  const [category, groups] = await Promise.all([
    deps.categories.findCategory(userId, categoryId),
    deps.categories.listGroups(userId),
  ]);
  const group = groups.find((item) => item.nameKey === FINANCIAL_CHARGES_GROUP_KEY);
  return { category, financialGroupId: group?.id ?? null };
}

async function chargeIdsOf(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
): Promise<Set<string>> {
  const lines = await deps.statements.detailLines(userId, statementId);
  return new Set(lines.charges.map((line) => line.movementId));
}

async function writeCharge(
  deps: StatementDependencies,
  userId: string,
  loaded: Loaded,
  request: ChargeRequest,
  existingId: string | null,
): Promise<StatementResult<string>> {
  const refs = await chargeReferences(deps, userId, request.categoryId);
  if (!refs.category) {
    return failure("category_not_found");
  }
  const existing = existingId ? await deps.movements.find(userId, existingId) : null;
  const keepInactive = new Set<string>(
    existing?.categoryId ? [existing.categoryId, loaded.card.id] : [],
  );
  const planned = planCharge(targetOf(loaded.row), request, {
    card: loaded.card,
    category: refs.category,
    financialGroupId: refs.financialGroupId,
    keepInactive,
  });
  if (!planned.ok) {
    return failure(planned.violation);
  }
  if (existingId) {
    const replaced = await deps.movements.replace(userId, existingId, planned.plan);
    return replaced ? success(existingId) : failure("not_found");
  }
  const created = await deps.movements.create(userId, planned.plan);
  return success(created.id);
}

export async function addCharge(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
  request: ChargeRequest,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  if (!loaded) {
    return failure("not_found");
  }
  const written = await writeCharge(deps, userId, loaded, request, null);
  return written.ok ? respond(deps, userId, statementId) : written;
}

export async function editCharge(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
  movementId: string,
  request: ChargeRequest,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  if (!loaded || !(await chargeIdsOf(deps, userId, statementId)).has(movementId)) {
    return failure("not_found");
  }
  const written = await writeCharge(deps, userId, loaded, request, movementId);
  return written.ok ? respond(deps, userId, statementId) : written;
}

export async function removeCharge(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
  movementId: string,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  if (!loaded || !(await chargeIdsOf(deps, userId, statementId)).has(movementId)) {
    return failure("not_found");
  }
  await deps.movements.remove(userId, movementId);
  return respond(deps, userId, statementId);
}

export async function payStatement(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
  request: StatementPaymentRequest,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  if (!loaded) {
    return failure("not_found");
  }
  const source = await deps.accounts.find(userId, request.fromAccountId);
  if (!source) {
    return failure("account_not_found");
  }
  const planned = planPayment(targetOf(loaded.row), request, { card: loaded.card, source });
  if (!planned.ok) {
    return failure(planned.violation);
  }
  await deps.movements.createAll(userId, planned.plans);
  return respond(deps, userId, statementId);
}

export async function adjustStatement(
  deps: StatementDependencies,
  userId: string,
  statementId: string,
  request: AdjustmentRequest,
): Promise<StatementResult<StatementDetail>> {
  const loaded = await load(deps, userId, statementId);
  if (!loaded) {
    return failure("not_found");
  }
  const detail = await detailOf(deps, userId, loaded);
  const totals = detail.totals.find((item) => item.currency === request.currency);
  if (!totals) {
    return failure("currency_not_in_account");
  }
  if (totals.bankTotalMinor === null) {
    return failure("bank_total_missing");
  }
  const existing = detail.charges.filter(
    (line) => line.isAdjustment && line.currency === request.currency,
  );
  const alreadyAdjusted = existing.reduce((sum, line) => sum + line.amountMinor, 0);
  const amountMinor = totals.bankTotalMinor - (totals.totalMinor - alreadyAdjusted);
  if (amountMinor <= 0) {
    return failure("no_positive_difference");
  }
  const categories = await deps.categories.listCategories(userId);
  const category = adjustmentCategoryOf(categories);
  if (!category) {
    return failure("category_not_found");
  }
  const charge: ChargeRequest = {
    categoryId: category.id,
    currency: request.currency,
    amountMinor,
    description: null,
    occurredOn: null,
  };
  const [first, ...rest] = existing;
  const written = await writeCharge(deps, userId, loaded, charge, first?.movementId ?? null);
  if (!written.ok) {
    return written;
  }
  for (const line of rest) {
    await deps.movements.remove(userId, line.movementId);
  }
  return respond(deps, userId, statementId);
}
