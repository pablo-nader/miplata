import type {
  Account,
  CategoryDto,
  Currency,
  EntryRequest,
  IsoDate,
  TransferRequest,
  YearMonth,
} from "@miplata/shared";
import { monthOf } from "@miplata/shared";
import {
  assignInstallmentStatements,
  type Statement,
  type StatementOverrides,
} from "../../statements/domain/statement-assignment";
import { type PurchaseShare, splitPurchase } from "./installments";

export type MovementViolation =
  | "account_not_found"
  | "account_not_allowed"
  | "account_inactive"
  | "currency_not_in_account"
  | "category_not_found"
  | "category_type_mismatch"
  | "category_inactive"
  | "person_not_found"
  | "person_not_allowed"
  | "person_share_invalid"
  | "installments_not_allowed"
  | "card_without_schedule"
  | "amount_too_small"
  | "transfer_same_account"
  | "transfer_amount_mismatch";

export type PostingPlan = {
  accountId: string;
  currency: Currency;
  amountMinor: number;
};

export type InstallmentPlan = {
  number: number;
  periodMonth: YearMonth;
  currency: Currency;
  amountMinor: number;
  ownAmountMinor: number;
};

export type StatementPlan = {
  accountId: string;
  statements: Statement[];
};

export type MovementPlan = {
  type: "income" | "expense" | "transfer";
  occurredOn: IsoDate;
  description: string | null;
  categoryId: string | null;
  postings: PostingPlan[];
  installments: InstallmentPlan[];
  statementPlan: StatementPlan | null;
};

export type PlanOutcome =
  | { ok: true; plan: MovementPlan }
  | { ok: false; violation: MovementViolation };

export type EntryReferences = {
  account: Account;
  person: Account | null;
  category: CategoryDto;
  keepInactive: ReadonlySet<string>;
};

export type TransferReferences = {
  from: Account;
  to: Account;
  keepInactive: ReadonlySet<string>;
};

function violation(reason: MovementViolation): PlanOutcome {
  return { ok: false, violation: reason };
}

function holds(account: Account, currency: Currency): boolean {
  return account.currencies.some((entry) => entry.currency === currency);
}

function isUsable(account: Account, keepInactive: ReadonlySet<string>): boolean {
  return account.isActive || keepInactive.has(account.id);
}

function shareOf(request: EntryRequest): PurchaseShare {
  if (request.type === "income" || request.person === null) {
    return { kind: "own" };
  }
  return request.person.ownAmountMinor === 0
    ? { kind: "forOther" }
    : { kind: "shared", ownMinor: request.person.ownAmountMinor };
}

function checkPerson(request: EntryRequest, refs: EntryReferences): MovementViolation | null {
  const { person, keepInactive } = refs;
  if (request.person === null) {
    return null;
  }
  if (request.type !== "expense") {
    return "person_not_allowed";
  }
  if (person?.type !== "person") {
    return "person_not_found";
  }
  if (!isUsable(person, keepInactive)) {
    return "account_inactive";
  }
  if (!holds(person, request.currency)) {
    return "currency_not_in_account";
  }
  return request.person.ownAmountMinor < request.amountMinor ? null : "person_share_invalid";
}

function checkEntry(request: EntryRequest, refs: EntryReferences): MovementViolation | null {
  const { account, category, keepInactive } = refs;
  if (category.type !== request.type) {
    return "category_type_mismatch";
  }
  if (!category.isActive && !keepInactive.has(category.id)) {
    return "category_inactive";
  }
  if (account.type === "person") {
    return "account_not_allowed";
  }
  if (!isUsable(account, keepInactive)) {
    return "account_inactive";
  }
  if (!holds(account, request.currency)) {
    return "currency_not_in_account";
  }
  const personViolation = checkPerson(request, refs);
  if (personViolation) {
    return personViolation;
  }
  const isCardPurchase = account.type === "credit_card" && request.type === "expense";
  if (request.installments > 1 && !isCardPurchase) {
    return "installments_not_allowed";
  }
  if (isCardPurchase && (account.closingDay === null || account.dueDay === null)) {
    return "card_without_schedule";
  }
  return request.amountMinor < request.installments ? "amount_too_small" : null;
}

function entryPostings(
  request: EntryRequest,
  ownTotalMinor: number,
  person: Account | null,
): PostingPlan[] {
  const sign = request.type === "expense" ? -1 : 1;
  const postings: PostingPlan[] = [
    {
      accountId: request.accountId,
      currency: request.currency,
      amountMinor: sign * request.amountMinor,
    },
  ];
  if (request.person && person && ownTotalMinor < request.amountMinor) {
    postings.push({
      accountId: person.id,
      currency: request.currency,
      amountMinor: request.amountMinor - ownTotalMinor,
    });
  }
  return postings;
}

export function planEntry(
  request: EntryRequest,
  refs: EntryReferences,
  overrides: StatementOverrides,
): PlanOutcome {
  const problem = checkEntry(request, refs);
  if (problem) {
    return violation(problem);
  }
  const { account } = refs;
  const shares = splitPurchase(request.amountMinor, request.installments, shareOf(request));
  const isCardPurchase = account.type === "credit_card" && request.type === "expense";
  const statements = isCardPurchase
    ? assignInstallmentStatements(
        request.occurredOn,
        request.installments,
        { closingDay: account.closingDay as number, dueDay: account.dueDay as number },
        overrides,
      )
    : null;
  const installments = shares.map((share, index) => ({
    number: index + 1,
    periodMonth: statements
      ? (statements[index] as Statement).periodMonth
      : monthOf(request.occurredOn),
    currency: request.currency,
    amountMinor: share.amountMinor,
    ownAmountMinor: share.ownAmountMinor,
  }));
  const ownTotal = installments.reduce((sum, item) => sum + item.ownAmountMinor, 0);
  return {
    ok: true,
    plan: {
      type: request.type,
      occurredOn: request.occurredOn,
      description: request.description,
      categoryId: request.categoryId,
      postings: entryPostings(request, ownTotal, refs.person),
      installments,
      statementPlan: statements ? { accountId: account.id, statements } : null,
    },
  };
}

export function planTransfer(request: TransferRequest, refs: TransferReferences): PlanOutcome {
  const { from, to, keepInactive } = refs;
  if (!isUsable(from, keepInactive) || !isUsable(to, keepInactive)) {
    return violation("account_inactive");
  }
  if (!holds(from, request.from.currency) || !holds(to, request.to.currency)) {
    return violation("currency_not_in_account");
  }
  const sameCurrency = request.from.currency === request.to.currency;
  if (from.id === to.id && (sameCurrency || from.type === "person")) {
    return violation("transfer_same_account");
  }
  if (sameCurrency && request.from.amountMinor !== request.to.amountMinor) {
    return violation("transfer_amount_mismatch");
  }
  return {
    ok: true,
    plan: {
      type: "transfer",
      occurredOn: request.occurredOn,
      description: request.description,
      categoryId: null,
      postings: [
        {
          accountId: from.id,
          currency: request.from.currency,
          amountMinor: -request.from.amountMinor,
        },
        { accountId: to.id, currency: request.to.currency, amountMinor: request.to.amountMinor },
      ],
      installments: [],
      statementPlan: null,
    },
  };
}
