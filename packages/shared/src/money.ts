import { z } from "zod";
import { parseScaledDecimal } from "./decimal";
import { toSafeInteger } from "./rounding";

export const CURRENCIES = ["ARS", "USD"] as const;

export type Currency = (typeof CURRENCIES)[number];

export type Money = {
  readonly amountMinor: number;
  readonly currency: Currency;
};

export const currencySchema = z.enum(CURRENCIES);

export const minorUnitsSchema = z.int();

export const moneySchema = z.object({
  amountMinor: minorUnitsSchema,
  currency: currencySchema,
});

export function money(amountMinor: number, currency: Currency): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError(`Amount must be a safe integer of minor units: ${amountMinor}`);
  }
  if (!currencySchema.safeParse(currency).success) {
    throw new TypeError(`Unsupported currency: ${currency}`);
  }
  return { amountMinor: amountMinor + 0, currency };
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new TypeError(`Currency mismatch: ${a.currency} and ${b.currency}`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

export function negateMoney(a: Money): Money {
  return money(-a.amountMinor, a.currency);
}

export function isZeroMoney(a: Money): boolean {
  return a.amountMinor === 0;
}

export function compareMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameCurrency(a, b);
  if (a.amountMinor === b.amountMinor) {
    return 0;
  }
  return a.amountMinor < b.amountMinor ? -1 : 1;
}

export function sumMoney(list: readonly Money[], currency: Currency): Money {
  return list.reduce((total, item) => addMoney(total, item), money(0, currency));
}

export function parseMoney(input: string, currency: Currency): Money {
  const { negative, scaled } = parseScaledDecimal(input, 2);
  return money(toSafeInteger(negative ? -scaled : scaled), currency);
}
