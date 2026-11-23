import type { AccountCurrencyInput, AccountType, Institution } from "@miplata/shared";

export type AccountDraft = {
  type: AccountType;
  institutionId: string | null;
  name: string | null;
  closingDay: number | null;
  dueDay: number | null;
  currencies: AccountCurrencyInput[];
};

export type AccountViolation =
  | "institution_not_allowed"
  | "institution_not_found"
  | "institution_kind_mismatch"
  | "name_required"
  | "card_days_not_allowed"
  | "currencies_invalid";

export type Normalized =
  | { ok: true; value: AccountDraft }
  | { ok: false; violation: AccountViolation };

const institutionTypes: readonly AccountType[] = ["bank", "wallet", "credit_card"];

function fail(violation: AccountViolation): Normalized {
  return { ok: false, violation };
}

function hasValidCurrencies(currencies: readonly AccountCurrencyInput[]): boolean {
  const distinct = new Set(currencies.map((item) => item.currency));
  return currencies.length >= 1 && distinct.size === currencies.length;
}

export function normalizeAccount(
  draft: AccountDraft,
  institution: Institution | null,
  options: { keepsNameKey?: boolean } = {},
): Normalized {
  if (!hasValidCurrencies(draft.currencies)) {
    return fail("currencies_invalid");
  }
  if (draft.type !== "credit_card" && (draft.closingDay !== null || draft.dueDay !== null)) {
    return fail("card_days_not_allowed");
  }
  if (draft.institutionId !== null) {
    if (!institutionTypes.includes(draft.type)) {
      return fail("institution_not_allowed");
    }
    if (!institution || institution.id !== draft.institutionId) {
      return fail("institution_not_found");
    }
    if (draft.type !== "credit_card" && institution.kind !== draft.type) {
      return fail("institution_kind_mismatch");
    }
  }
  const name = draft.name ?? institution?.name ?? null;
  if (name === null && !options.keepsNameKey) {
    return fail("name_required");
  }
  return { ok: true, value: { ...draft, name } };
}
