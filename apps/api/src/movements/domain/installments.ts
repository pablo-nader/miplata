export type InstallmentShare = {
  amountMinor: number;
  ownAmountMinor: number;
  owedMinor: number;
};

export type PurchaseShare =
  | { kind: "own" }
  | { kind: "forOther" }
  | { kind: "shared"; ownMinor: number };

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive integer: ${value}`);
  }
}

export function splitIntoInstallments(totalMinor: number, count: number): number[] {
  assertPositiveInteger(totalMinor, "Total");
  assertPositiveInteger(count, "Installment count");
  if (totalMinor < count) {
    throw new RangeError("Total must be at least one minor unit per installment");
  }
  const base = Math.floor(totalMinor / count);
  const difference = totalMinor - base * count;
  return Array.from({ length: count }, (_, index) => (index === 0 ? base + difference : base));
}

export function allocateOwnShare(
  installmentsMinor: readonly number[],
  ownTotalMinor: number,
): InstallmentShare[] {
  if (installmentsMinor.length === 0) {
    throw new RangeError("At least one installment is required");
  }
  for (const amount of installmentsMinor) {
    assertPositiveInteger(amount, "Installment amount");
  }
  const total = installmentsMinor.reduce((sum, amount) => sum + amount, 0);
  if (!Number.isSafeInteger(ownTotalMinor) || ownTotalMinor < 0 || ownTotalMinor > total) {
    throw new RangeError(`Own total must be an integer between 0 and ${total}: ${ownTotalMinor}`);
  }

  const bigOwn = BigInt(ownTotalMinor);
  const bigTotal = BigInt(total);
  const shares = installmentsMinor.map((amount, index) => {
    const product = bigOwn * BigInt(amount);
    return { index, floor: product / bigTotal, remainder: product % bigTotal };
  });
  const allocated = shares.reduce((sum, share) => sum + share.floor, 0n);
  const leftover = Number(bigOwn - allocated);
  const winners = new Set(
    [...shares]
      .sort((a, b) =>
        a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
      )
      .slice(0, leftover)
      .map((share) => share.index),
  );

  return shares.map((share) => {
    const amountMinor = installmentsMinor[share.index] as number;
    const ownAmountMinor = Number(share.floor) + (winners.has(share.index) ? 1 : 0);
    return { amountMinor, ownAmountMinor, owedMinor: amountMinor - ownAmountMinor };
  });
}

export function splitPurchase(
  totalMinor: number,
  count: number,
  share: PurchaseShare,
): InstallmentShare[] {
  const installments = splitIntoInstallments(totalMinor, count);
  if (share.kind === "own") {
    return allocateOwnShare(installments, totalMinor);
  }
  if (share.kind === "forOther") {
    return allocateOwnShare(installments, 0);
  }
  return allocateOwnShare(installments, share.ownMinor);
}
