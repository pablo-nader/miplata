import {
  type Account,
  type AccountCurrencyInput,
  type AccountType,
  type CreateAccountRequest,
  type CreatePersonRequest,
  type Currency,
  type Institution,
  parseMoney,
  type UpdateAccountRequest,
  type UpdatePersonRequest,
} from "@miplata/shared";

export const CURRENCY_LIST: readonly Currency[] = ["ARS", "USD"];

export type CurrencyField = { enabled: boolean; amount: string };

export type FormState = {
  type: AccountType;
  institutionId: string | null;
  name: string;
  currencies: Record<Currency, CurrencyField>;
  closingDay: string;
  dueDay: string;
};

export type FormErrors = {
  name?: "nameRequired" | "nameTooLong";
  currencies?: "currencyRequired";
  amounts: Partial<Record<Currency, "amountInvalid">>;
  closingDay?: "dayInvalid";
  dueDay?: "dayInvalid";
};

export type CreateSubmission =
  | { kind: "account"; body: CreateAccountRequest }
  | { kind: "person"; body: CreatePersonRequest };

export type UpdateSubmission =
  | { kind: "account"; body: UpdateAccountRequest }
  | { kind: "person"; body: UpdatePersonRequest };

export type Built<T> = { ok: true; value: T } | { ok: false; errors: FormErrors };

export const INSTITUTION_TYPES: readonly AccountType[] = ["bank", "wallet", "credit_card"];

export function emptyForm(type: AccountType = "bank"): FormState {
  return {
    type,
    institutionId: null,
    name: "",
    currencies: {
      ARS: { enabled: true, amount: "" },
      USD: { enabled: false, amount: "" },
    },
    closingDay: "",
    dueDay: "",
  };
}

function amountText(openingMinor: number, type: AccountType): string {
  const entered = toEntered(openingMinor, type);
  return entered === 0 ? "" : String(entered / 100);
}

export function formFromAccount(account: Account, name: string): FormState {
  const form = emptyForm(account.type);
  const currencies = { ...form.currencies };
  for (const currency of CURRENCY_LIST) {
    const entry = account.currencies.find((item) => item.currency === currency);
    currencies[currency] = entry
      ? { enabled: true, amount: amountText(entry.openingBalanceMinor, account.type) }
      : { enabled: false, amount: "" };
  }
  return {
    ...form,
    institutionId: account.institution?.id ?? null,
    name,
    currencies,
    closingDay: account.closingDay ? String(account.closingDay) : "",
    dueDay: account.dueDay ? String(account.dueDay) : "",
  };
}

function toEntered(openingMinor: number, type: AccountType): number {
  return type === "credit_card" ? -openingMinor : openingMinor;
}

function toOpening(enteredMinor: number, type: AccountType): number {
  return type === "credit_card" ? -enteredMinor : enteredMinor;
}

function parseDay(text: string): number | null | "invalid" {
  const trimmed = text.trim();
  if (trimmed === "") {
    return null;
  }
  const day = Number(trimmed);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : "invalid";
}

type Parsed = {
  errors: FormErrors;
  currencies: AccountCurrencyInput[];
  closingDay: number | null;
  dueDay: number | null;
};

function parse(form: FormState, institution: Institution | null): Parsed {
  const errors: FormErrors = { amounts: {} };
  if (form.name.trim() === "" && !institution) {
    errors.name = "nameRequired";
  } else if (form.name.trim().length > 60) {
    errors.name = "nameTooLong";
  }
  const currencies: AccountCurrencyInput[] = [];
  for (const currency of CURRENCY_LIST) {
    const field = form.currencies[currency];
    if (!field.enabled) {
      continue;
    }
    try {
      const minor = field.amount.trim() === "" ? 0 : parseMoney(field.amount, currency).amountMinor;
      currencies.push({ currency, openingBalanceMinor: toOpening(minor, form.type) + 0 });
    } catch {
      errors.amounts[currency] = "amountInvalid";
    }
  }
  if (!form.currencies.ARS.enabled && !form.currencies.USD.enabled) {
    errors.currencies = "currencyRequired";
  }
  let closingDay: number | null = null;
  let dueDay: number | null = null;
  if (form.type === "credit_card") {
    const closing = parseDay(form.closingDay);
    const due = parseDay(form.dueDay);
    if (closing === "invalid") {
      errors.closingDay = "dayInvalid";
    } else {
      closingDay = closing;
    }
    if (due === "invalid") {
      errors.dueDay = "dayInvalid";
    } else {
      dueDay = due;
    }
  }
  return { errors, currencies, closingDay, dueDay };
}

function hasErrors(errors: FormErrors): boolean {
  return (
    Object.keys(errors.amounts).length > 0 ||
    errors.name !== undefined ||
    errors.currencies !== undefined ||
    errors.closingDay !== undefined ||
    errors.dueDay !== undefined
  );
}

function institutionOf(form: FormState, institutions: readonly Institution[]) {
  return institutions.find((item) => item.id === form.institutionId) ?? null;
}

export function buildCreate(
  form: FormState,
  institutions: readonly Institution[],
): Built<CreateSubmission> {
  const institution = institutionOf(form, institutions);
  const parsed = parse(form, institution);
  if (hasErrors(parsed.errors)) {
    return { ok: false, errors: parsed.errors };
  }
  const name = form.name.trim();
  if (form.type === "person") {
    return {
      ok: true,
      value: { kind: "person", body: { name, currencies: parsed.currencies } },
    };
  }
  return {
    ok: true,
    value: {
      kind: "account",
      body: {
        type: form.type as CreateAccountRequest["type"],
        currencies: parsed.currencies,
        ...(name ? { name } : {}),
        ...(institution ? { institutionId: institution.id } : {}),
        ...(form.type === "credit_card"
          ? { closingDay: parsed.closingDay, dueDay: parsed.dueDay }
          : {}),
      },
    },
  };
}

export function buildUpdate(
  form: FormState,
  institutions: readonly Institution[],
  original: { account: Account; displayName: string },
): Built<UpdateSubmission> {
  const institution = institutionOf(form, institutions);
  const parsed = parse(form, institution);
  if (hasErrors(parsed.errors)) {
    return { ok: false, errors: parsed.errors };
  }
  const name = form.name.trim() || institution?.name || "";
  const nameChange = name !== "" && name !== original.displayName ? { name } : {};
  if (form.type === "person") {
    return {
      ok: true,
      value: { kind: "person", body: { ...nameChange, currencies: parsed.currencies } },
    };
  }
  return {
    ok: true,
    value: {
      kind: "account",
      body: {
        ...nameChange,
        currencies: parsed.currencies,
        institutionId: institution?.id ?? null,
        ...(form.type === "credit_card"
          ? { closingDay: parsed.closingDay, dueDay: parsed.dueDay }
          : {}),
      },
    },
  };
}

export function institutionsFor(
  type: AccountType,
  institutions: readonly Institution[],
): Institution[] {
  if (type === "credit_card") {
    return [...institutions];
  }
  return institutions.filter((item) => item.kind === type);
}
