import { currencySchema } from "@miplata/shared";
import { emptyForm, type FormState, units } from "./movement-form";

export function prefillFromSearch(params: URLSearchParams, today: string): FormState | null {
  if (params.get("type") !== "transfer") {
    return null;
  }
  const currency = currencySchema.safeParse(params.get("currency"));
  const amountText = params.get("amountMinor") ?? "";
  const amountMinor = /^\d+$/.test(amountText) ? Number(amountText) : 0;
  const form = emptyForm(today, "transfer");
  if (currency.success) {
    form.fromCurrency = currency.data;
    form.toCurrency = currency.data;
  }
  if (currency.success && Number.isSafeInteger(amountMinor) && amountMinor > 0) {
    form.fromAmount = units(amountMinor);
    form.toAmount = units(amountMinor);
  }
  form.fromAccountId = params.get("from") || null;
  form.toAccountId = params.get("to") || null;
  return form;
}
