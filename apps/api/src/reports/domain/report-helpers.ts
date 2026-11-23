import {
  type Currency,
  divideRounded,
  monthsBetween,
  sumMinorUnits,
  type YearMonth,
} from "@miplata/shared";

export type ReportInstallment = {
  kind: "income" | "expense";
  periodMonth: YearMonth;
  currency: Currency;
  ownAmountMinor: number;
};

export type MonthRange = {
  from: YearMonth;
  to: YearMonth;
  currency: Currency;
};

export type MonthlyInOut = {
  month: YearMonth;
  inMinor: number;
  outMinor: number;
  resultMinor: number;
};

const PREVIOUS_MONTHS = 3;

export function percentChangeVsPreviousThree(
  currentMinor: number,
  previousMinor: readonly number[],
): number | null {
  if (previousMinor.length !== PREVIOUS_MONTHS) {
    throw new RangeError(`Exactly ${PREVIOUS_MONTHS} previous months are required`);
  }
  for (const value of [currentMinor, ...previousMinor]) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`Amount must be an integer of minor units: ${value}`);
    }
  }
  const sum = sumMinorUnits(previousMinor);
  if (sum === 0) {
    return null;
  }
  const numerator = BigInt(PREVIOUS_MONTHS) * BigInt(currentMinor) - BigInt(sum);
  const denominator = BigInt(sum);
  const negative = numerator < 0n !== denominator < 0n;
  const magnitude = divideRounded(
    (numerator < 0n ? -numerator : numerator) * 1000n,
    denominator < 0n ? -denominator : denominator,
    "half-up",
  );
  return (negative ? -Number(magnitude) : Number(magnitude)) / 10 + 0;
}

export function monthlyInOut(
  installments: readonly ReportInstallment[],
  range: MonthRange,
): MonthlyInOut[] {
  return monthsBetween(range.from, range.to).map((month) => {
    const rows = installments.filter(
      (item) => item.periodMonth === month && item.currency === range.currency,
    );
    const total = (kind: ReportInstallment["kind"]) =>
      sumMinorUnits(rows.filter((item) => item.kind === kind).map((item) => item.ownAmountMinor));
    const inMinor = total("income");
    const outMinor = total("expense");
    return { month, inMinor, outMinor, resultMinor: inMinor - outMinor };
  });
}
