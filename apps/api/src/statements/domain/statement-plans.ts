import type {
  Account,
  CategoryDto,
  ChargeRequest,
  Currency,
  StatementPaymentRequest,
} from "@miplata/shared";
import {
  type MovementPlan,
  type MovementViolation,
  planTransfer,
} from "../../movements/domain/movement-plan";

export type StatementTarget = {
  id: string;
  periodMonth: string;
  closingDate: string;
};

export type StatementViolation =
  | MovementViolation
  | "category_not_allowed"
  | "closing_outside_period"
  | "due_before_closing"
  | "no_positive_difference"
  | "bank_total_missing";

export type ChargeOutcome =
  | { ok: true; plan: MovementPlan }
  | { ok: false; violation: StatementViolation };

export type PaymentOutcome =
  | { ok: true; plans: MovementPlan[] }
  | { ok: false; violation: StatementViolation };

export type ChargeReferences = {
  card: Account;
  category: CategoryDto;
  financialGroupId: string | null;
  keepInactive: ReadonlySet<string>;
};

function holds(account: Account, currency: Currency): boolean {
  return account.currencies.some((entry) => entry.currency === currency);
}

export function planCharge(
  statement: StatementTarget,
  request: ChargeRequest,
  refs: ChargeReferences,
): ChargeOutcome {
  const { card, category, financialGroupId, keepInactive } = refs;
  if (
    category.type !== "expense" ||
    financialGroupId === null ||
    category.groupId !== financialGroupId
  ) {
    return { ok: false, violation: "category_not_allowed" };
  }
  if (!category.isActive && !keepInactive.has(category.id)) {
    return { ok: false, violation: "category_inactive" };
  }
  if (!card.isActive && !keepInactive.has(card.id)) {
    return { ok: false, violation: "account_inactive" };
  }
  if (!holds(card, request.currency)) {
    return { ok: false, violation: "currency_not_in_account" };
  }
  return {
    ok: true,
    plan: {
      type: "expense",
      occurredOn: request.occurredOn ?? statement.closingDate,
      description: request.description,
      categoryId: category.id,
      postings: [
        { accountId: card.id, currency: request.currency, amountMinor: -request.amountMinor },
      ],
      installments: [
        {
          number: 1,
          periodMonth: statement.periodMonth,
          currency: request.currency,
          amountMinor: request.amountMinor,
          ownAmountMinor: request.amountMinor,
        },
      ],
      statementPlan: null,
      statementId: statement.id,
    },
  };
}

type Leg = { currency: Currency; amountMinor: number };

export function planPayment(
  statement: StatementTarget,
  request: StatementPaymentRequest,
  refs: { card: Account; source: Account },
): PaymentOutcome {
  const { card, source } = refs;
  if (source.type === "person" || source.type === "credit_card") {
    return { ok: false, violation: "account_not_allowed" };
  }
  const legs: { from: Leg; to: Leg }[] = [];
  if (request.arsMinor > 0) {
    legs.push({
      from: { currency: "ARS", amountMinor: request.arsMinor },
      to: { currency: "ARS", amountMinor: request.arsMinor },
    });
  }
  if (request.usdMinor > 0) {
    legs.push({
      from:
        request.usdSource === "ars"
          ? { currency: "ARS", amountMinor: request.usdSourceAmountMinor as number }
          : { currency: "USD", amountMinor: request.usdMinor },
      to: { currency: "USD", amountMinor: request.usdMinor },
    });
  }
  const plans: MovementPlan[] = [];
  for (const leg of legs) {
    const planned = planTransfer(
      {
        type: "transfer",
        occurredOn: request.occurredOn,
        description: null,
        from: { accountId: source.id, ...leg.from },
        to: { accountId: card.id, ...leg.to },
      },
      { from: source, to: card, keepInactive: new Set() },
    );
    if (!planned.ok) {
      return planned;
    }
    plans.push({ ...planned.plan, statementId: statement.id });
  }
  return { ok: true, plans };
}
