import {
  type Currency,
  isoDateSchema,
  MAX_AMOUNT_MINOR,
  parseMoney,
  type StatementPaymentRequest,
  type StatementTotals,
} from "@miplata/shared";
import { payableMinor } from "./statement-view";

export type PayMode = "total" | "minimum" | "other";

export type PayForm = {
  mode: PayMode;
  sourceId: string | null;
  date: string;
  arsText: string;
  usdText: string;
  usdWithPesos: boolean;
  pesosText: string;
};

export type PayAmounts = { arsMinor: number; usdMinor: number };

export type PayErrorKey = "source" | "amount" | "date" | "pesos";

export type PayBuilt =
  | { ok: true; value: StatementPaymentRequest }
  | { ok: false; errors: Partial<Record<PayErrorKey, true>> };

export function emptyPayForm(dueDate: string): PayForm {
  return {
    mode: "total",
    sourceId: null,
    date: dueDate,
    arsText: "",
    usdText: "",
    usdWithPesos: false,
    pesosText: "",
  };
}

export function parseOptionalMinor(text: string, currency: Currency): number | null {
  if (text.trim() === "") {
    return 0;
  }
  try {
    const { amountMinor } = parseMoney(text, currency);
    return amountMinor >= 0 && amountMinor <= MAX_AMOUNT_MINOR ? amountMinor : null;
  } catch {
    return null;
  }
}

export function hasMinimum(ars: StatementTotals | undefined, usd: StatementTotals | undefined) {
  return [ars, usd].some(
    (totals) => totals?.minimumMinor !== null && totals?.minimumMinor !== undefined,
  );
}

function minimumOf(totals: StatementTotals | undefined): number {
  return Math.min(totals?.minimumMinor ?? 0, payableMinor(totals));
}

export function amountsFor(
  form: PayForm,
  ars: StatementTotals | undefined,
  usd: StatementTotals | undefined,
): PayAmounts | null {
  if (form.mode === "total") {
    return { arsMinor: payableMinor(ars), usdMinor: payableMinor(usd) };
  }
  if (form.mode === "minimum") {
    return { arsMinor: minimumOf(ars), usdMinor: minimumOf(usd) };
  }
  const arsMinor = parseOptionalMinor(form.arsText, "ARS");
  const usdMinor = parseOptionalMinor(form.usdText, "USD");
  return arsMinor === null || usdMinor === null ? null : { arsMinor, usdMinor };
}

export function buildPayment(form: PayForm, amounts: PayAmounts | null): PayBuilt {
  const errors: Partial<Record<PayErrorKey, true>> = {};
  if (!form.sourceId) {
    errors.source = true;
  }
  if (!isoDateSchema.safeParse(form.date).success) {
    errors.date = true;
  }
  if (amounts === null || (amounts.arsMinor === 0 && amounts.usdMinor === 0)) {
    errors.amount = true;
  }
  const withPesos = form.usdWithPesos && (amounts?.usdMinor ?? 0) > 0;
  const pesosMinor = withPesos ? parseOptionalMinor(form.pesosText, "ARS") : null;
  if (withPesos && (pesosMinor === null || pesosMinor === 0)) {
    errors.pesos = true;
  }
  if (Object.keys(errors).length > 0 || amounts === null || !form.sourceId) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      fromAccountId: form.sourceId,
      occurredOn: form.date,
      arsMinor: amounts.arsMinor,
      usdMinor: amounts.usdMinor,
      usdSource: withPesos ? "ars" : "usd",
      usdSourceAmountMinor: withPesos ? pesosMinor : null,
    },
  };
}
