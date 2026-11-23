export type Currency = "ARS" | "USD";
export type MoneyLocale = "es-AR" | "en-US";
export type MoneyDirection = "income" | "expense" | "neutral";

export const MINUS = "−";
export const SPACE = " ";

const prefixes: Record<Currency, string> = { ARS: "$", USD: "US$" };

export function localeForLanguage(language: string): MoneyLocale {
  return language.toLowerCase().startsWith("en") ? "en-US" : "es-AR";
}

function formatNumber(value: number, locale: MoneyLocale): string {
  const fractionDigits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    useGrouping: "always",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function signFor(amount: number, direction: MoneyDirection): string {
  if (amount === 0) return "";
  if (direction === "income") return "+";
  if (direction === "expense") return MINUS;
  return amount < 0 ? MINUS : "";
}

export function formatMoney(
  amount: number,
  currency: Currency,
  locale: MoneyLocale,
  direction: MoneyDirection = "neutral",
): string {
  const sign = signFor(amount, direction);
  const body = `${prefixes[currency]}${SPACE}${formatNumber(Math.abs(amount), locale)}`;
  return sign ? `${sign}${SPACE}${body}` : body;
}

export function formatRate(rate: number, locale: MoneyLocale): string {
  const body = new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(rate);
  return `${prefixes.ARS}${SPACE}${body}`;
}
