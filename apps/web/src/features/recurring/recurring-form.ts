import {
  type Account,
  type AmountMode,
  type Currency,
  isoDateSchema,
  type Recurring,
  type RecurringFrequencyName,
  type RecurringRequest,
} from "@miplata/shared";
import { currenciesOf, holdsCurrency, parseAmountMinor, units } from "../movements/movement-form";

export type FormType = "expense" | "income";

export type FormState = {
  type: FormType;
  description: string;
  amountMode: AmountMode;
  amount: string;
  currency: Currency;
  accountId: string | null;
  categoryId: string | null;
  frequency: RecurringFrequencyName;
  dayOfMonth: string;
  startsOn: string;
  endsOn: string;
};

export type FormErrorKey = "amount" | "category" | "account" | "day" | "startsOn" | "endsOn";

export type FormErrors = Partial<Record<FormErrorKey, true>>;

export type Built = { ok: true; value: RecurringRequest } | { ok: false; errors: FormErrors };

export function emptyForm(today: string): FormState {
  return {
    type: "expense",
    description: "",
    amountMode: "fixed",
    amount: "",
    currency: "ARS",
    accountId: null,
    categoryId: null,
    frequency: "monthly",
    dayOfMonth: today.slice(8, 10).replace(/^0/, ""),
    startsOn: today,
    endsOn: "",
  };
}

export function formFromRecurring(recurring: Recurring): FormState {
  return {
    type: recurring.type,
    description: recurring.description ?? "",
    amountMode: recurring.amountMode,
    amount: recurring.amountMinor === null ? "" : units(recurring.amountMinor),
    currency: recurring.currency,
    accountId: recurring.accountId,
    categoryId: recurring.categoryId,
    frequency: recurring.frequency,
    dayOfMonth: String(recurring.dayOfMonth),
    startsOn: recurring.startsOn,
    endsOn: recurring.endsOn ?? "",
  };
}

function parseDay(text: string): number | null {
  const day = Number(text.trim());
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : null;
}

export function buildRequest(form: FormState): Built {
  const errors: FormErrors = {};
  const amountMinor = parseAmountMinor(form.amount, form.currency);
  const typedAmount = form.amount.trim() !== "";
  const day = parseDay(form.dayOfMonth);
  if (form.amountMode === "fixed" ? amountMinor === null : typedAmount && amountMinor === null) {
    errors.amount = true;
  }
  if (!form.categoryId) errors.category = true;
  if (!form.accountId) errors.account = true;
  if (day === null) errors.day = true;
  if (!isoDateSchema.safeParse(form.startsOn).success) errors.startsOn = true;
  const hasEnd = form.endsOn.trim() !== "";
  if (hasEnd && (!isoDateSchema.safeParse(form.endsOn).success || form.endsOn < form.startsOn)) {
    errors.endsOn = true;
  }
  if (Object.keys(errors).length > 0 || !form.categoryId || !form.accountId || day === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      type: form.type,
      frequency: form.frequency,
      dayOfMonth: day,
      amountMode: form.amountMode,
      amountMinor,
      currency: form.currency,
      accountId: form.accountId,
      categoryId: form.categoryId,
      description: form.description.trim() || null,
      startsOn: form.startsOn,
      endsOn: hasEnd ? form.endsOn : null,
    },
  };
}

export function applyChange(
  form: FormState,
  patch: Partial<FormState>,
  accounts: readonly Account[],
): FormState {
  const next = { ...form, ...patch };
  if (patch.type && patch.type !== form.type) {
    next.categoryId = null;
  }
  const account = accounts.find((item) => item.id === next.accountId);
  if (account && !holdsCurrency(account, next.currency)) {
    next.currency = currenciesOf(account)[0] ?? next.currency;
  }
  return next;
}
