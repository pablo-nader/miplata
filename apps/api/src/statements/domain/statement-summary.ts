import {
  type Currency,
  type IsoDate,
  monthOf,
  type StatementTotals,
  sumMinorUnits,
  type YearMonth,
} from "@miplata/shared";

export type StatementRow = {
  id: string;
  accountId: string;
  periodMonth: YearMonth;
  closingDate: IsoDate;
  dueDate: IsoDate;
  minimumMinor: Readonly<Record<Currency, number | null>>;
  bankTotalMinor: Readonly<Record<Currency, number | null>>;
};

export type LineKind = "own" | "others" | "charges" | "payments";

export type AmountLine = {
  statementId: string;
  currency: Currency;
  kind: LineKind;
  amountMinor: number;
};

export type SummaryInput = {
  statements: readonly StatementRow[];
  lines: readonly AmountLine[];
  currencies: readonly Currency[];
  openingDebtMinor: Readonly<Record<Currency, number>>;
};

export type StatementDatesViolation = "closing_outside_period" | "due_before_closing";

function amountOf(
  lines: readonly AmountLine[],
  statementId: string,
  currency: Currency,
  kind: LineKind,
): number {
  return sumMinorUnits(
    lines
      .filter(
        (line) =>
          line.statementId === statementId && line.currency === currency && line.kind === kind,
      )
      .map((line) => line.amountMinor),
  );
}

export function summarizeStatements(input: SummaryInput) {
  const ordered = [...input.statements].sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
  const carried: Record<string, number> = {};
  return ordered.map((statement) => {
    const totals: StatementTotals[] = input.currencies.map((currency) => {
      const previousBalanceMinor = carried[currency] ?? input.openingDebtMinor[currency] ?? 0;
      const ownMinor = amountOf(input.lines, statement.id, currency, "own");
      const othersMinor = amountOf(input.lines, statement.id, currency, "others");
      const chargesMinor = amountOf(input.lines, statement.id, currency, "charges");
      const paymentsMinor = amountOf(input.lines, statement.id, currency, "payments");
      const totalMinor = sumMinorUnits([
        previousBalanceMinor,
        ownMinor,
        othersMinor,
        chargesMinor,
        -paymentsMinor,
      ]);
      const bankTotalMinor = statement.bankTotalMinor[currency];
      carried[currency] = totalMinor;
      return {
        currency,
        previousBalanceMinor,
        ownMinor,
        othersMinor,
        chargesMinor,
        paymentsMinor,
        totalMinor,
        minimumMinor: statement.minimumMinor[currency],
        bankTotalMinor,
        differenceMinor: bankTotalMinor === null ? null : bankTotalMinor - totalMinor,
      };
    });
    return {
      id: statement.id,
      accountId: statement.accountId,
      periodMonth: statement.periodMonth,
      closingDate: statement.closingDate,
      dueDate: statement.dueDate,
      totals,
    };
  });
}

export function checkStatementDates(
  periodMonth: YearMonth,
  closingDate: IsoDate,
  dueDate: IsoDate,
): StatementDatesViolation | null {
  if (monthOf(closingDate) !== periodMonth) {
    return "closing_outside_period";
  }
  return dueDate > closingDate ? null : "due_before_closing";
}
