import type {
  Currency,
  IsoDate,
  StatementDetail,
  StatementOtherLine,
  StatementSummary,
  StatementTotals,
} from "@miplata/shared";
import type { MoneyLocale } from "../../ui/format/money";

export function defaultPeriod(
  items: readonly StatementSummary[],
  today: IsoDate,
): StatementSummary | null {
  const upcoming = items.find((item) => item.closingDate >= today);
  return upcoming ?? items.at(-1) ?? null;
}

export function totalsFor(
  statement: Pick<StatementSummary, "totals">,
  currency: Currency,
): StatementTotals | undefined {
  return statement.totals.find((item) => item.currency === currency);
}

export function hasActivity(totals: StatementTotals | undefined): boolean {
  if (!totals) {
    return false;
  }
  return (
    totals.previousBalanceMinor !== 0 ||
    totals.ownMinor !== 0 ||
    totals.othersMinor !== 0 ||
    totals.chargesMinor !== 0 ||
    totals.paymentsMinor !== 0 ||
    totals.totalMinor !== 0
  );
}

export function monthLabel(month: string, locale: MoneyLocale): string {
  const label = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" })
    .format(new Date(`${month}-01T00:00:00Z`))
    .replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shortDate(date: IsoDate, locale: MoneyLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export type OwedByPerson = { personId: string | null; currency: Currency; amountMinor: number };

export function owedByPerson(others: readonly StatementOtherLine[]): OwedByPerson[] {
  const sums = new Map<string, OwedByPerson>();
  for (const line of others) {
    const key = `${line.personId ?? ""}:${line.currency}`;
    const current = sums.get(key);
    sums.set(key, {
      personId: line.personId,
      currency: line.currency,
      amountMinor: (current?.amountMinor ?? 0) + line.amountMinor,
    });
  }
  return [...sums.values()];
}

export function payableMinor(totals: StatementTotals | undefined): number {
  return totals ? Math.max(totals.totalMinor, 0) : 0;
}

export function positiveDifference(totals: StatementTotals | undefined): number {
  return totals?.differenceMinor && totals.differenceMinor > 0 ? totals.differenceMinor : 0;
}

export function adjustmentOf(detail: StatementDetail, currency: Currency): number {
  return detail.charges
    .filter((line) => line.isAdjustment && line.currency === currency)
    .reduce((sum, line) => sum + line.amountMinor, 0);
}
