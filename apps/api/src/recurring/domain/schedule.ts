import { addMonths, dateInMonth, type IsoDate, monthOf, type YearMonth } from "@miplata/shared";

export type RecurringFrequency = "monthly" | "bimonthly" | "yearly";

export type RecurringRule = {
  frequency: RecurringFrequency;
  dayOfMonth: number;
  monthOfYear?: number | undefined;
  startsOn: IsoDate;
  endsOn: IsoDate | null;
  isPaused: boolean;
};

const STEP_MONTHS: Record<RecurringFrequency, number> = {
  monthly: 1,
  bimonthly: 2,
  yearly: 12,
};

function assertRule(rule: RecurringRule): void {
  if (!Number.isInteger(rule.dayOfMonth) || rule.dayOfMonth < 1 || rule.dayOfMonth > 31) {
    throw new RangeError(`Day of month must be an integer from 1 to 31: ${rule.dayOfMonth}`);
  }
  if (rule.endsOn !== null && rule.endsOn < rule.startsOn) {
    throw new RangeError(`End date ${rule.endsOn} is before start date ${rule.startsOn}`);
  }
  if (rule.frequency === "yearly") {
    const month = rule.monthOfYear;
    if (month === undefined || !Number.isInteger(month) || month < 1 || month > 12) {
      throw new RangeError(`Yearly rules need a month of year from 1 to 12: ${month}`);
    }
  }
}

function firstAnchorMonth(rule: RecurringRule): YearMonth {
  if (rule.frequency === "yearly") {
    return addMonths(`${rule.startsOn.slice(0, 4)}-01`, (rule.monthOfYear as number) - 1);
  }
  return monthOf(rule.startsOn);
}

export function dueDatesBetween(rule: RecurringRule, from: IsoDate, to: IsoDate): IsoDate[] {
  assertRule(rule);
  if (rule.isPaused) {
    return [];
  }
  const lower = from > rule.startsOn ? from : rule.startsOn;
  const upper = rule.endsOn !== null && rule.endsOn < to ? rule.endsOn : to;
  const lastMonth = monthOf(upper);
  const step = STEP_MONTHS[rule.frequency];
  const dates: IsoDate[] = [];
  for (let month = firstAnchorMonth(rule); month <= lastMonth; month = addMonths(month, step)) {
    const date = dateInMonth(month, rule.dayOfMonth);
    if (date >= lower && date <= upper) {
      dates.push(date);
    }
  }
  return dates;
}
