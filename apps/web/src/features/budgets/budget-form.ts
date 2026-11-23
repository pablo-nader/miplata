import {
  type Budget,
  type BudgetRequest,
  type Currency,
  MAX_AMOUNT_MINOR,
  parseMoney,
} from "@miplata/shared";

export const CURRENCY_LIST: readonly Currency[] = ["ARS", "USD"];

export type TargetKind = "category" | "group";

export type BudgetFormState = {
  kind: TargetKind;
  categoryId: string | null;
  groupId: string | null;
  currency: Currency;
  limit: string;
};

export type BudgetFormErrors = {
  target?: "targetRequired";
  limit?: "limitInvalid";
};

export type BuiltBudget =
  | { ok: true; value: BudgetRequest }
  | { ok: false; errors: BudgetFormErrors };

export function emptyBudgetForm(): BudgetFormState {
  return { kind: "category", categoryId: null, groupId: null, currency: "ARS", limit: "" };
}

export function formFromBudget(budget: Budget): BudgetFormState {
  return {
    kind: budget.groupId ? "group" : "category",
    categoryId: budget.categoryId,
    groupId: budget.groupId,
    currency: budget.currency,
    limit: String(budget.limitMinor / 100),
  };
}

function limitMinor(text: string, currency: Currency): number | null {
  try {
    const parsed = parseMoney(text, currency).amountMinor;
    return parsed > 0 && parsed <= MAX_AMOUNT_MINOR ? parsed : null;
  } catch {
    return null;
  }
}

export function buildBudgetRequest(form: BudgetFormState): BuiltBudget {
  const errors: BudgetFormErrors = {};
  const target = form.kind === "category" ? form.categoryId : form.groupId;
  if (!target) {
    errors.target = "targetRequired";
  }
  const limit = limitMinor(form.limit, form.currency);
  if (limit === null) {
    errors.limit = "limitInvalid";
  }
  if (!target || limit === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      categoryId: form.kind === "category" ? target : null,
      groupId: form.kind === "group" ? target : null,
      currency: form.currency,
      limitMinor: limit,
    },
  };
}
