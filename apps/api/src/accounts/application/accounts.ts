import type { Account, AccountCurrencyInput, Currency, Institution } from "@miplata/shared";
import {
  type AccountDraft,
  type AccountViolation,
  normalizeAccount,
} from "../domain/account-rules";

export type NewAccount = AccountDraft & { name: string };

export type AccountChange = {
  institutionId?: string | null | undefined;
  name?: string | undefined;
  closingDay?: number | null | undefined;
  dueDay?: number | null | undefined;
  currencies?: AccountCurrencyInput[] | undefined;
};

export type RemoveOutcome = "deleted" | "not_found" | "in_use";

export type AccountRepository = {
  list(userId: string): Promise<Account[]>;
  find(userId: string, accountId: string): Promise<Account | null>;
  create(userId: string, account: NewAccount): Promise<Account>;
  update(userId: string, accountId: string, change: AccountChange): Promise<Account | null>;
  setActive(userId: string, accountId: string, isActive: boolean): Promise<Account | null>;
  remove(userId: string, accountId: string): Promise<RemoveOutcome>;
  postedCurrencies(userId: string, accountId: string): Promise<Currency[]>;
};

export type InstitutionRepository = {
  list(): Promise<Institution[]>;
  find(institutionId: string): Promise<Institution | null>;
};

export type AccountError = AccountViolation | "not_found" | "currency_in_use" | "account_in_use";

export type AccountResult<T> = { ok: true; value: T } | { ok: false; error: AccountError };

function failure<T>(error: AccountError): AccountResult<T> {
  return { ok: false, error };
}

export function listAccounts(accounts: AccountRepository, userId: string) {
  return accounts.list(userId);
}

export function listInstitutions(institutions: InstitutionRepository) {
  return institutions.list();
}

export async function getAccount(
  accounts: AccountRepository,
  userId: string,
  accountId: string,
): Promise<AccountResult<Account>> {
  const account = await accounts.find(userId, accountId);
  return account ? { ok: true, value: account } : failure("not_found");
}

export async function createAccount(
  accounts: AccountRepository,
  institutions: InstitutionRepository,
  userId: string,
  draft: AccountDraft,
): Promise<AccountResult<Account>> {
  const institution = draft.institutionId ? await institutions.find(draft.institutionId) : null;
  const normalized = normalizeAccount(draft, institution);
  if (!normalized.ok) {
    return failure(normalized.violation);
  }
  const { value } = normalized;
  const created = await accounts.create(userId, { ...value, name: value.name as string });
  return { ok: true, value: created };
}

export async function updateAccount(
  accounts: AccountRepository,
  institutions: InstitutionRepository,
  userId: string,
  accountId: string,
  change: AccountChange,
): Promise<AccountResult<Account>> {
  const existing = await accounts.find(userId, accountId);
  if (!existing) {
    return failure("not_found");
  }
  const institutionId =
    change.institutionId === undefined ? (existing.institution?.id ?? null) : change.institutionId;
  const currencies =
    change.currencies ??
    existing.currencies.map(({ currency, openingBalanceMinor }) => ({
      currency,
      openingBalanceMinor,
    }));
  const institution = institutionId ? await institutions.find(institutionId) : null;
  const normalized = normalizeAccount(
    {
      type: existing.type,
      institutionId,
      name: change.name ?? existing.name,
      closingDay: change.closingDay === undefined ? existing.closingDay : change.closingDay,
      dueDay: change.dueDay === undefined ? existing.dueDay : change.dueDay,
      currencies,
    },
    institution,
    { keepsNameKey: existing.nameKey !== null },
  );
  if (!normalized.ok) {
    return failure(normalized.violation);
  }
  if (change.currencies) {
    const kept = new Set(change.currencies.map((entry) => entry.currency));
    const posted = await accounts.postedCurrencies(userId, accountId);
    if (posted.some((currency) => !kept.has(currency))) {
      return failure("currency_in_use");
    }
  }
  const { value } = normalized;
  const updated = await accounts.update(userId, accountId, {
    institutionId: value.institutionId,
    closingDay: value.closingDay,
    dueDay: value.dueDay,
    ...(value.name !== null && value.name !== existing.name ? { name: value.name } : {}),
    ...(change.currencies ? { currencies: change.currencies } : {}),
  });
  return updated ? { ok: true, value: updated } : failure("not_found");
}

export async function setAccountActive(
  accounts: AccountRepository,
  userId: string,
  accountId: string,
  isActive: boolean,
): Promise<AccountResult<Account>> {
  const updated = await accounts.setActive(userId, accountId, isActive);
  return updated ? { ok: true, value: updated } : failure("not_found");
}

export async function deleteAccount(
  accounts: AccountRepository,
  userId: string,
  accountId: string,
): Promise<AccountResult<null>> {
  const outcome = await accounts.remove(userId, accountId);
  if (outcome === "deleted") {
    return { ok: true, value: null };
  }
  return failure(outcome === "in_use" ? "account_in_use" : "not_found");
}
