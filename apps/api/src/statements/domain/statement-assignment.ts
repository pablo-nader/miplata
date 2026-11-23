import {
  addMonths,
  dateInMonth,
  type IsoDate,
  isoDateSchema,
  monthOf,
  sumMinorUnits,
  type YearMonth,
} from "@miplata/shared";

export type StatementSchedule = {
  closingDay: number;
  dueDay: number;
};

export type StatementOverride = {
  closingDate: IsoDate;
  dueDate: IsoDate;
};

export type StatementOverrides = Readonly<Record<YearMonth, StatementOverride>>;

export type Statement = {
  periodMonth: YearMonth;
  closingDate: IsoDate;
  dueDate: IsoDate;
};

export type StatementTotalParts = {
  previousBalanceMinor: number;
  installmentsMinor: readonly number[];
  chargesMinor: readonly number[];
  paymentsMinor: readonly number[];
};

function assertDay(day: number, label: string): void {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError(`${label} must be an integer from 1 to 31: ${day}`);
  }
}

function assertOverride(period: YearMonth, override: StatementOverride): void {
  if (
    !isoDateSchema.safeParse(override.closingDate).success ||
    !isoDateSchema.safeParse(override.dueDate).success
  ) {
    throw new RangeError("Override dates must be real calendar dates");
  }
  if (monthOf(override.closingDate) !== period) {
    throw new RangeError(`Closing date ${override.closingDate} is outside statement ${period}`);
  }
  if (override.dueDate <= override.closingDate) {
    throw new RangeError(`Due date ${override.dueDate} must be after ${override.closingDate}`);
  }
}

export function statementForPeriod(
  schedule: StatementSchedule,
  periodMonth: YearMonth,
  overrides: StatementOverrides = {},
): Statement {
  assertDay(schedule.closingDay, "Closing day");
  assertDay(schedule.dueDay, "Due day");
  const override = overrides[periodMonth];
  if (override) {
    assertOverride(periodMonth, override);
    return { periodMonth, closingDate: override.closingDate, dueDate: override.dueDate };
  }
  const closingDate = dateInMonth(periodMonth, schedule.closingDay);
  const sameMonthDue = dateInMonth(periodMonth, schedule.dueDay);
  const dueDate =
    sameMonthDue > closingDate
      ? sameMonthDue
      : dateInMonth(addMonths(periodMonth, 1), schedule.dueDay);
  return { periodMonth, closingDate, dueDate };
}

export function statementForPurchase(
  purchaseDate: IsoDate,
  schedule: StatementSchedule,
  overrides: StatementOverrides = {},
): Statement {
  const month = monthOf(purchaseDate);
  const current = statementForPeriod(schedule, month, overrides);
  if (purchaseDate <= current.closingDate) {
    return current;
  }
  return statementForPeriod(schedule, addMonths(month, 1), overrides);
}

export function assignInstallmentStatements(
  purchaseDate: IsoDate,
  installmentCount: number,
  schedule: StatementSchedule,
  overrides: StatementOverrides = {},
): Statement[] {
  if (!Number.isInteger(installmentCount) || installmentCount < 1) {
    throw new RangeError(`Installment count must be a positive integer: ${installmentCount}`);
  }
  const first = statementForPurchase(purchaseDate, schedule, overrides);
  return Array.from({ length: installmentCount }, (_, index) =>
    index === 0
      ? first
      : statementForPeriod(schedule, addMonths(first.periodMonth, index), overrides),
  );
}

export function statementTotal(parts: StatementTotalParts): number {
  return sumMinorUnits([
    parts.previousBalanceMinor,
    ...parts.installmentsMinor,
    ...parts.chargesMinor,
    ...parts.paymentsMinor.map((payment) => -payment),
  ]);
}
