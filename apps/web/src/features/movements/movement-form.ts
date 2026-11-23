import {
  type Account,
  type Currency,
  type EntryRequest,
  isoDateSchema,
  type Movement,
  type MovementRequest,
  parseMoney,
  rateFromAmounts,
  type TransferRequest,
} from "@miplata/shared";

export type FormType = "expense" | "income" | "transfer";

export type FormState = {
  type: FormType;
  amount: string;
  currency: Currency;
  categoryId: string | null;
  accountId: string | null;
  installments: number;
  description: string;
  date: string;
  forOther: boolean;
  personId: string | null;
  ownShare: string;
  fromAccountId: string | null;
  fromCurrency: Currency;
  fromAmount: string;
  toAccountId: string | null;
  toCurrency: Currency;
  toAmount: string;
};

export type FormErrorKey =
  | "amount"
  | "category"
  | "account"
  | "person"
  | "share"
  | "fromAccount"
  | "toAccount"
  | "fromAmount"
  | "toAmount"
  | "date";

export type FormErrors = Partial<Record<FormErrorKey, true>>;

export type Built = { ok: true; value: MovementRequest } | { ok: false; errors: FormErrors };

export const INSTALLMENT_CHOICES: readonly number[] = [1, 2, 3, 4, 5, 6, 9, 12, 18, 24];

export function emptyForm(today: string, type: FormType = "expense"): FormState {
  return {
    type,
    amount: "",
    currency: "ARS",
    categoryId: null,
    accountId: null,
    installments: 1,
    description: "",
    date: today,
    forOther: false,
    personId: null,
    ownShare: "",
    fromAccountId: null,
    fromCurrency: "ARS",
    fromAmount: "",
    toAccountId: null,
    toCurrency: "ARS",
    toAmount: "",
  };
}

function units(minor: number): string {
  return minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2).replace(".", ",");
}

export function formFromMovement(movement: Movement): FormState {
  const base = emptyForm(movement.occurredOn, movement.type);
  const description = movement.description ?? "";
  if (movement.type === "transfer" && movement.from && movement.to) {
    return {
      ...base,
      description,
      fromAccountId: movement.from.accountId,
      fromCurrency: movement.from.currency,
      fromAmount: units(movement.from.amountMinor),
      toAccountId: movement.to.accountId,
      toCurrency: movement.to.currency,
      toAmount: units(movement.to.amountMinor),
    };
  }
  const leg = movement.account;
  return {
    ...base,
    description,
    categoryId: movement.categoryId,
    accountId: leg?.accountId ?? null,
    currency: leg?.currency ?? "ARS",
    amount: leg ? units(leg.amountMinor) : "",
    installments: movement.installments.length || 1,
    forOther: movement.person !== null,
    personId: movement.person?.personId ?? null,
    ownShare:
      movement.person && movement.person.ownAmountMinor > 0
        ? units(movement.person.ownAmountMinor)
        : "",
  };
}

export function parseAmountMinor(text: string, currency: Currency): number | null {
  try {
    const { amountMinor } = parseMoney(text, currency);
    return amountMinor > 0 ? amountMinor : null;
  } catch {
    return null;
  }
}

function parseShareMinor(text: string, currency: Currency): number | null {
  if (text.trim() === "") {
    return 0;
  }
  try {
    const { amountMinor } = parseMoney(text, currency);
    return amountMinor >= 0 ? amountMinor : null;
  } catch {
    return null;
  }
}

function buildEntry(form: FormState): Built {
  const errors: FormErrors = {};
  const amountMinor = parseAmountMinor(form.amount, form.currency);
  if (amountMinor === null) errors.amount = true;
  if (!form.categoryId) errors.category = true;
  if (!form.accountId) errors.account = true;
  if (!isoDateSchema.safeParse(form.date).success) errors.date = true;
  let person: EntryRequest["person"] = null;
  if (form.forOther && form.type === "expense") {
    const own = parseShareMinor(form.ownShare, form.currency);
    if (!form.personId) errors.person = true;
    if (own === null || (amountMinor !== null && own >= amountMinor)) errors.share = true;
    if (form.personId && own !== null) person = { personId: form.personId, ownAmountMinor: own };
  }
  if (
    Object.keys(errors).length > 0 ||
    amountMinor === null ||
    !form.categoryId ||
    !form.accountId
  ) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      type: form.type === "income" ? "income" : "expense",
      occurredOn: form.date,
      description: form.description.trim() || null,
      categoryId: form.categoryId,
      accountId: form.accountId,
      currency: form.currency,
      amountMinor,
      installments: form.type === "expense" ? form.installments : 1,
      person,
    },
  };
}

function buildTransfer(form: FormState): Built {
  const errors: FormErrors = {};
  const out = parseAmountMinor(form.fromAmount, form.fromCurrency);
  const into = parseAmountMinor(form.toAmount, form.toCurrency);
  if (!form.fromAccountId) errors.fromAccount = true;
  if (!form.toAccountId) errors.toAccount = true;
  if (out === null) errors.fromAmount = true;
  if (into === null) errors.toAmount = true;
  if (!isoDateSchema.safeParse(form.date).success) errors.date = true;
  if (
    Object.keys(errors).length > 0 ||
    !form.fromAccountId ||
    !form.toAccountId ||
    out === null ||
    into === null
  ) {
    return { ok: false, errors };
  }
  const value: TransferRequest = {
    type: "transfer",
    occurredOn: form.date,
    description: form.description.trim() || null,
    from: { accountId: form.fromAccountId, currency: form.fromCurrency, amountMinor: out },
    to: { accountId: form.toAccountId, currency: form.toCurrency, amountMinor: into },
  };
  return { ok: true, value };
}

export function buildRequest(form: FormState): Built {
  return form.type === "transfer" ? buildTransfer(form) : buildEntry(form);
}

export function installmentAmountMinor(form: FormState): number | null {
  const total = parseAmountMinor(form.amount, form.currency);
  if (total === null || form.installments < 1 || total < form.installments) {
    return null;
  }
  return Math.floor(total / form.installments);
}

export function exchangeRate(form: FormState): number | null {
  if (form.type !== "transfer" || form.fromCurrency === form.toCurrency) {
    return null;
  }
  const out = parseAmountMinor(form.fromAmount, form.fromCurrency);
  const into = parseAmountMinor(form.toAmount, form.toCurrency);
  if (out === null || into === null) {
    return null;
  }
  const [pesos, dollars] = form.fromCurrency === "ARS" ? [out, into] : [into, out];
  return (
    rateFromAmounts(
      { amountMinor: pesos, currency: "ARS" },
      { amountMinor: dollars, currency: "USD" },
      "half-up",
    ) / 10_000
  );
}

export function holdsCurrency(account: Account | undefined, currency: Currency): boolean {
  return account?.currencies.some((entry) => entry.currency === currency) ?? false;
}

export function currenciesOf(account: Account | undefined): Currency[] {
  return account?.currencies.map((entry) => entry.currency) ?? [];
}

function firstCurrency(account: Account | undefined, fallback: Currency): Currency {
  return currenciesOf(account)[0] ?? fallback;
}

export function isCardExpense(form: FormState, account: Account | undefined): boolean {
  return form.type === "expense" && account?.type === "credit_card";
}

export function defaultAccountId(accounts: readonly Account[]): string | null {
  return accounts.find((account) => account.isActive && account.type !== "person")?.id ?? null;
}

export function applyChange(
  form: FormState,
  patch: Partial<FormState>,
  accounts: readonly Account[],
): FormState {
  const byId = new Map(accounts.map((account) => [account.id, account]));
  const next = { ...form, ...patch };
  if (patch.type && patch.type !== form.type) {
    if (patch.type !== "expense") {
      next.forOther = false;
    }
    if (patch.type !== "transfer" && form.type !== "transfer" && patch.type !== form.type) {
      next.categoryId = null;
    }
    if (patch.type === "transfer") {
      next.fromAccountId = form.accountId ?? form.fromAccountId;
      next.fromCurrency = form.currency;
      next.fromAmount = form.amount;
      next.categoryId = null;
    }
    if (form.type === "transfer" && patch.type !== "transfer") {
      const source = form.fromAccountId ? byId.get(form.fromAccountId) : undefined;
      if (source && source.type !== "person") {
        next.accountId = source.id;
      }
      next.currency = form.fromCurrency;
      next.amount = form.fromAmount;
    }
  }
  const account = next.accountId ? byId.get(next.accountId) : undefined;
  if (account && !holdsCurrency(account, next.currency)) {
    next.currency = firstCurrency(account, next.currency);
  }
  const from = next.fromAccountId ? byId.get(next.fromAccountId) : undefined;
  if (from && !holdsCurrency(from, next.fromCurrency)) {
    next.fromCurrency = firstCurrency(from, next.fromCurrency);
  }
  const to = next.toAccountId ? byId.get(next.toAccountId) : undefined;
  if (to && !holdsCurrency(to, next.toCurrency)) {
    next.toCurrency = firstCurrency(to, next.toCurrency);
  }
  if (!isCardExpense(next, account)) {
    next.installments = 1;
  }
  return next;
}
