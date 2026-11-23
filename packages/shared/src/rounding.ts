export type RoundingMode = "half-up" | "floor" | "ceil";

export function divideRounded(numerator: bigint, denominator: bigint, mode: RoundingMode): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  if (remainder === 0n) {
    return quotient;
  }
  if (mode === "floor") {
    return quotient;
  }
  if (mode === "ceil") {
    return quotient + 1n;
  }
  return remainder * 2n >= denominator ? quotient + 1n : quotient;
}

export function toSafeInteger(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Amount is outside the safe integer range");
  }
  return Number(value);
}
