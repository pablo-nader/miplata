import {
  type BankFiguresRequest,
  type ChargeRequest,
  type Currency,
  isoDateSchema,
  MAX_AMOUNT_MINOR,
  parseMoney,
  type StatementChargeLine,
  type StatementTotals,
} from "@miplata/shared";

export type ChargeForm = {
  categoryId: string | null;
  currency: Currency;
  amount: string;
  description: string;
  date: string;
};

export type ChargeErrorKey = "category" | "amount" | "date";

export type ChargeBuilt =
  | { ok: true; value: ChargeRequest }
  | { ok: false; errors: Partial<Record<ChargeErrorKey, true>> };

export function units(amountMinor: number): string {
  const text = (amountMinor / 100).toFixed(2).replace(".", ",");
  return text.endsWith(",00") ? text.slice(0, -3) : text;
}

export function emptyChargeForm(closingDate: string, currency: Currency = "ARS"): ChargeForm {
  return { categoryId: null, currency, amount: "", description: "", date: closingDate };
}

export function chargeFormFrom(line: StatementChargeLine): ChargeForm {
  return {
    categoryId: line.categoryId,
    currency: line.currency,
    amount: units(line.amountMinor),
    description: line.description ?? "",
    date: line.occurredOn,
  };
}

function parsePositiveMinor(text: string, currency: Currency): number | null {
  try {
    const { amountMinor } = parseMoney(text, currency);
    return amountMinor > 0 && amountMinor <= MAX_AMOUNT_MINOR ? amountMinor : null;
  } catch {
    return null;
  }
}

export function buildCharge(form: ChargeForm): ChargeBuilt {
  const errors: Partial<Record<ChargeErrorKey, true>> = {};
  const amountMinor = parsePositiveMinor(form.amount, form.currency);
  if (!form.categoryId) {
    errors.category = true;
  }
  if (amountMinor === null) {
    errors.amount = true;
  }
  if (!isoDateSchema.safeParse(form.date).success) {
    errors.date = true;
  }
  if (Object.keys(errors).length > 0 || !form.categoryId || amountMinor === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      categoryId: form.categoryId,
      currency: form.currency,
      amountMinor,
      description: form.description.trim() === "" ? null : form.description.trim(),
      occurredOn: form.date,
    },
  };
}

export type ReconcileForm = {
  arsTotal: string;
  arsMinimum: string;
  usdTotal: string;
  usdMinimum: string;
};

export type ReconcileBuilt =
  | { ok: true; value: BankFiguresRequest }
  | { ok: false; errors: Partial<Record<keyof ReconcileForm, true>> };

export function reconcileFormFrom(
  ars: StatementTotals | undefined,
  usd: StatementTotals | undefined,
): ReconcileForm {
  const show = (value: number | null | undefined) =>
    value === null || value === undefined ? "" : units(value);
  return {
    arsTotal: show(ars?.bankTotalMinor),
    arsMinimum: show(ars?.minimumMinor),
    usdTotal: show(usd?.bankTotalMinor),
    usdMinimum: show(usd?.minimumMinor),
  };
}

function parseOrNull(text: string, currency: Currency): number | null | "invalid" {
  if (text.trim() === "") {
    return null;
  }
  try {
    const { amountMinor } = parseMoney(text, currency);
    return amountMinor >= 0 && amountMinor <= MAX_AMOUNT_MINOR ? amountMinor : "invalid";
  } catch {
    return "invalid";
  }
}

export function buildReconcile(form: ReconcileForm): ReconcileBuilt {
  const parsed = {
    arsTotal: parseOrNull(form.arsTotal, "ARS"),
    arsMinimum: parseOrNull(form.arsMinimum, "ARS"),
    usdTotal: parseOrNull(form.usdTotal, "USD"),
    usdMinimum: parseOrNull(form.usdMinimum, "USD"),
  };
  const errors: Partial<Record<keyof ReconcileForm, true>> = {};
  for (const key of Object.keys(parsed) as (keyof ReconcileForm)[]) {
    if (parsed[key] === "invalid") {
      errors[key] = true;
    }
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  const value = (key: keyof ReconcileForm) => parsed[key] as number | null;
  return {
    ok: true,
    value: {
      bankTotalArsMinor: value("arsTotal"),
      minimumArsMinor: value("arsMinimum"),
      bankTotalUsdMinor: value("usdTotal"),
      minimumUsdMinor: value("usdMinimum"),
    },
  };
}
