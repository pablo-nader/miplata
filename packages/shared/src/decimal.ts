const THOUSANDS_GROUPS = /^\d{1,3}(?:[.,]\d{3})*$/;

type Parts = { integer: string; fraction: string };

function splitAtLast(text: string, separator: string, other: string): Parts | null {
  const index = text.lastIndexOf(separator);
  const integer = text.slice(0, index);
  const fraction = text.slice(index + 1);
  if (integer.includes(separator) && !integer.includes(other)) {
    return null;
  }
  return { integer, fraction };
}

function splitBothSeparators(text: string): Parts | null {
  const decimal = text.lastIndexOf(".") > text.lastIndexOf(",") ? "." : ",";
  const thousands = decimal === "." ? "," : ".";
  const parts = splitAtLast(text, decimal, thousands);
  if (!parts || parts.integer.includes(decimal)) {
    return null;
  }
  return parts;
}

function splitOneSeparator(text: string, separator: string): Parts | null {
  const count = text.split(separator).length - 1;
  if (count > 1) {
    return { integer: text, fraction: "" };
  }
  const [integer = "", fraction = ""] = text.split(separator);
  const looksLikeThousands =
    separator === "." && /^[1-9]\d{0,2}$/.test(integer) && /^\d{3}$/.test(fraction);
  return looksLikeThousands ? { integer: text, fraction: "" } : { integer, fraction };
}

function splitParts(text: string): Parts | null {
  const hasDot = text.includes(".");
  const hasComma = text.includes(",");
  if (hasDot && hasComma) {
    return splitBothSeparators(text);
  }
  if (hasDot) {
    return splitOneSeparator(text, ".");
  }
  if (hasComma) {
    return splitOneSeparator(text, ",");
  }
  return { integer: text, fraction: "" };
}

function stripThousands(integer: string): string | null {
  if (/^\d*$/.test(integer)) {
    return integer;
  }
  if (!THOUSANDS_GROUPS.test(integer)) {
    return null;
  }
  const separators = new Set(integer.replace(/\d/g, ""));
  if (separators.size > 1) {
    return null;
  }
  return integer.replace(/[.,]/g, "");
}

export type ScaledDecimal = { negative: boolean; scaled: bigint };

export function parseScaledDecimal(input: string, decimals: number): ScaledDecimal {
  const cleaned = input.replace(/[\s$]/g, "");
  const negative = cleaned.startsWith("-");
  const body = negative || cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (!/^[\d.,]+$/.test(body) || !/\d/.test(body)) {
    throw new SyntaxError(`Invalid amount: ${input}`);
  }
  const parts = splitParts(body);
  const integer = parts ? stripThousands(parts.integer) : null;
  if (!parts || integer === null || !/^\d*$/.test(parts.fraction)) {
    throw new SyntaxError(`Invalid amount: ${input}`);
  }
  if (parts.fraction.length > decimals) {
    throw new SyntaxError(`Too many decimals: ${input}`);
  }
  const scaled =
    BigInt(integer || "0") * 10n ** BigInt(decimals) + BigInt(parts.fraction.padEnd(decimals, "0"));
  return { negative, scaled };
}
