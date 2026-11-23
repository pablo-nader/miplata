import type { MoneyLocale } from "./money";

export const MAX_INTEGER_DIGITS = 10;
export const MAX_FRACTION_DIGITS = 2;

type Separators = { decimal: string; group: string };

const SEPARATORS: Record<MoneyLocale, Separators> = {
  "es-AR": { decimal: ",", group: "." },
  "en-US": { decimal: ".", group: "," },
};

export type AmountParts = {
  integer: string;
  fraction: string;
  hasDecimal: boolean;
  negative?: boolean;
};

export type Interpreted = { canonical: string; significantBefore: number; truncated: boolean };

export function decimalSeparator(locale: MoneyLocale): string {
  return SEPARATORS[locale].decimal;
}

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function normalizeInteger(digits: string): string {
  const trimmed = digits.replace(/^0+(?=\d)/, "");
  return trimmed.slice(0, MAX_INTEGER_DIGITS);
}

function tooLong(integer: string): boolean {
  return integer.replace(/^0+/, "").length > MAX_INTEGER_DIGITS;
}

export function toCanonical(parts: AmountParts): string {
  const sign = parts.negative ? "-" : "";
  const integer = normalizeInteger(parts.integer);
  if (!parts.hasDecimal) {
    return `${sign}${integer}`;
  }
  const fraction = parts.fraction.slice(0, MAX_FRACTION_DIGITS);
  return `${sign}${integer === "" ? "0" : integer}.${fraction}`;
}

export function fromCanonical(canonical: string): AmountParts {
  const negative = canonical.startsWith("-");
  const body = negative ? canonical.slice(1) : canonical;
  const index = body.indexOf(".");
  if (index === -1) {
    return { integer: body, fraction: "", hasDecimal: false, negative };
  }
  return {
    integer: body.slice(0, index),
    fraction: body.slice(index + 1),
    hasDecimal: true,
    negative,
  };
}

function groupInteger(integer: string, group: string): string {
  return integer.replace(/\B(?=(\d{3})+$)/g, group);
}

export function formatCanonical(canonical: string, locale: MoneyLocale): string {
  const { decimal, group } = SEPARATORS[locale];
  const parts = fromCanonical(canonical);
  const integer = groupInteger(parts.integer, group);
  const sign = parts.negative ? "-" : "";
  return parts.hasDecimal ? `${sign}${integer}${decimal}${parts.fraction}` : `${sign}${integer}`;
}

export function interpretTyping(
  raw: string,
  caret: number,
  locale: MoneyLocale,
  allowNegative = false,
): Interpreted {
  const { decimal } = SEPARATORS[locale];
  let integer = "";
  let fraction = "";
  let hasDecimal = false;
  let negative = false;
  let significantBefore = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw.charAt(index);
    if (allowNegative && (char === "-" || char === "−")) {
      negative = true;
      continue;
    }
    const kept = isDigit(char);
    const asDecimal = char === decimal && !hasDecimal;
    if (!kept && !asDecimal) {
      continue;
    }
    if (asDecimal) {
      hasDecimal = true;
    } else if (hasDecimal) {
      fraction += char;
    } else {
      integer += char;
    }
    if (index < caret) {
      significantBefore += 1;
    }
  }
  const leadingZeroAdded = hasDecimal && integer === "" && significantBefore > 0;
  return {
    canonical: toCanonical({ integer, fraction, hasDecimal, negative }),
    significantBefore: significantBefore + (leadingZeroAdded ? 1 : 0),
    truncated: tooLong(integer),
  };
}

export function parseLocalized(text: string, allowNegative = false): string {
  const negative = allowNegative && /^\s*[-−]/.test(text);
  const body = text.replace(/[^\d.,]/g, "");
  const lastDot = body.lastIndexOf(".");
  const lastComma = body.lastIndexOf(",");
  let decimalChar: string | null = null;
  if (lastDot !== -1 && lastComma !== -1) {
    decimalChar = lastDot > lastComma ? "." : ",";
  } else if (lastDot !== -1 || lastComma !== -1) {
    const only = lastDot !== -1 ? "." : ",";
    const occurrences = body.split(only).length - 1;
    const tail = body.slice(body.lastIndexOf(only) + 1);
    const head = body.slice(0, body.lastIndexOf(only));
    const grouped = tail.length === 3 && /^[1-9]\d{0,2}$/.test(head);
    decimalChar = occurrences > 1 || grouped ? null : only;
  }
  if (decimalChar === null) {
    if (tooLong(body.replace(/[.,]/g, ""))) {
      return "";
    }
    return toCanonical({
      integer: body.replace(/[.,]/g, ""),
      fraction: "",
      hasDecimal: false,
      negative,
    });
  }
  const index = body.lastIndexOf(decimalChar);
  if (tooLong(body.slice(0, index).replace(/[.,]/g, ""))) {
    return "";
  }
  return toCanonical({
    integer: body.slice(0, index).replace(/[.,]/g, ""),
    fraction: body.slice(index + 1).replace(/[.,]/g, ""),
    hasDecimal: true,
    negative,
  });
}

export function caretAfter(formatted: string, significant: number, locale: MoneyLocale): number {
  if (significant <= 0) {
    return formatted.startsWith("-") ? 1 : 0;
  }
  const { decimal } = SEPARATORS[locale];
  let seen = 0;
  for (let index = 0; index < formatted.length; index += 1) {
    const char = formatted.charAt(index);
    if (isDigit(char) || char === decimal) {
      seen += 1;
      if (seen === significant) {
        return index + 1;
      }
    }
  }
  return formatted.length;
}

export function minorToCanonical(minor: number): string {
  const sign = minor < 0 ? "-" : "";
  const abs = Math.abs(minor);
  const whole = Math.trunc(abs / 100);
  const cents = abs % 100;
  return cents === 0 ? `${sign}${whole}` : `${sign}${whole}.${String(cents).padStart(2, "0")}`;
}
