import { z } from "zod";
import { parseScaledDecimal } from "./decimal";
import { type Money, money } from "./money";
import { divideRounded, type RoundingMode, toSafeInteger } from "./rounding";

export type ExchangeRate = number;

const RATE_SCALE = 10_000n;

export const exchangeRateSchema = z.int().positive();

function assertRate(rate: ExchangeRate): void {
  if (!Number.isSafeInteger(rate) || rate <= 0) {
    throw new RangeError("Exchange rate must be a positive integer of ten-thousandths");
  }
}

function assertCurrency(value: Money, expected: "ARS" | "USD"): void {
  if (value.currency !== expected) {
    throw new TypeError(`Currency mismatch: expected ${expected}, got ${value.currency}`);
  }
}

function assertPositive(value: Money): void {
  if (value.amountMinor <= 0) {
    throw new RangeError("Amount must be positive");
  }
}

export function rateFromAmounts(ars: Money, usd: Money, rounding: RoundingMode): ExchangeRate {
  assertCurrency(ars, "ARS");
  assertCurrency(usd, "USD");
  assertPositive(ars);
  assertPositive(usd);
  const scaled = divideRounded(
    BigInt(ars.amountMinor) * RATE_SCALE,
    BigInt(usd.amountMinor),
    rounding,
  );
  return toSafeInteger(scaled);
}

export function arsFromUsd(usd: Money, rate: ExchangeRate, rounding: RoundingMode): Money {
  assertCurrency(usd, "USD");
  assertRate(rate);
  if (usd.amountMinor < 0) {
    throw new RangeError("Amount must not be negative");
  }
  const pesos = divideRounded(BigInt(usd.amountMinor) * BigInt(rate), RATE_SCALE, rounding);
  return money(toSafeInteger(pesos), "ARS");
}

export function usdFromArs(ars: Money, rate: ExchangeRate, rounding: RoundingMode): Money {
  assertCurrency(ars, "ARS");
  assertRate(rate);
  if (ars.amountMinor < 0) {
    throw new RangeError("Amount must not be negative");
  }
  const dollars = divideRounded(BigInt(ars.amountMinor) * RATE_SCALE, BigInt(rate), rounding);
  return money(toSafeInteger(dollars), "USD");
}

export function parseExchangeRate(input: string): ExchangeRate {
  const { negative, scaled } = parseScaledDecimal(input, 4);
  if (negative) {
    throw new SyntaxError(`Exchange rate must be positive: ${input}`);
  }
  const rate = toSafeInteger(scaled);
  assertRate(rate);
  return rate;
}
