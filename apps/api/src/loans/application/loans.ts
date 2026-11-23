import type {
  Account,
  ForgiveRequest,
  IsoDate,
  LoanDetail,
  LoansResponse,
  Movement,
} from "@miplata/shared";
import { monthOf } from "@miplata/shared";
import type { MovementDependencies } from "../../movements/application/movement-use-cases";
import type { MovementPlan } from "../../movements/domain/movement-plan";
import { loanLines, summarizeLoans } from "../domain/loan-summary";

export type LoanDependencies = MovementDependencies & { today: () => IsoDate };

export type LoanError =
  | "not_found"
  | "category_not_found"
  | "category_type_mismatch"
  | "category_inactive"
  | "nothing_owed"
  | "balance_changed";

export type LoanResult<T> = { ok: true; value: T } | { ok: false; error: LoanError };

const HISTORY_LIMIT = 100;

function failure<T>(error: LoanError): LoanResult<T> {
  return { ok: false, error };
}

async function listPeople(deps: LoanDependencies, userId: string): Promise<Account[]> {
  const accounts = await deps.accounts.list(userId);
  return accounts.filter((item) => item.type === "person");
}

export async function getLoans(deps: LoanDependencies, userId: string): Promise<LoansResponse> {
  const month = monthOf(deps.today());
  const [people, pending] = await Promise.all([
    listPeople(deps, userId),
    deps.movements.pendingPersonShares(userId, month),
  ]);
  return summarizeLoans(people, pending);
}

export async function getLoanDetail(
  deps: LoanDependencies,
  userId: string,
  personId: string,
): Promise<LoanResult<LoanDetail>> {
  const person = await deps.accounts.find(userId, personId);
  if (person?.type !== "person") {
    return failure("not_found");
  }
  const [pending, page] = await Promise.all([
    deps.movements.pendingPersonShares(userId, monthOf(deps.today())),
    deps.movements.list(userId, { personId, limit: HISTORY_LIMIT, offset: 0 }),
  ]);
  return {
    ok: true,
    value: {
      personId: person.id,
      name: person.name,
      isActive: person.isActive,
      owesYou: loanLines(person, pending, "owesYou"),
      youOwe: loanLines(person, pending, "youOwe"),
      movements: page.items,
    },
  };
}

export async function forgiveDebt(
  deps: LoanDependencies,
  userId: string,
  personId: string,
  request: ForgiveRequest,
): Promise<LoanResult<Movement>> {
  const [person, category] = await Promise.all([
    deps.accounts.find(userId, personId),
    deps.categories.findCategory(userId, request.categoryId),
  ]);
  if (person?.type !== "person") {
    return failure("not_found");
  }
  if (!category) {
    return failure("category_not_found");
  }
  const balance = person.currencies.find((entry) => entry.currency === request.currency);
  const balanceMinor = balance?.balanceMinor ?? 0;
  if (balanceMinor === 0) {
    return failure("nothing_owed");
  }
  const type = balanceMinor > 0 ? "expense" : "income";
  if (category.type !== type) {
    return failure("category_type_mismatch");
  }
  if (!category.isActive) {
    return failure("category_inactive");
  }
  const occurredOn = request.occurredOn ?? deps.today();
  const amountMinor = Math.abs(balanceMinor);
  const plan: MovementPlan = {
    type,
    occurredOn,
    description: null,
    categoryId: category.id,
    postings: [{ accountId: person.id, currency: request.currency, amountMinor: -balanceMinor }],
    installments: [
      {
        number: 1,
        periodMonth: monthOf(occurredOn),
        currency: request.currency,
        amountMinor,
        ownAmountMinor: amountMinor,
      },
    ],
    statementPlan: null,
  };
  const created = await deps.movements.createIfBalance(userId, plan, {
    accountId: person.id,
    currency: request.currency,
    balanceMinor,
  });
  return created === "balance_changed" ? failure("balance_changed") : { ok: true, value: created };
}
