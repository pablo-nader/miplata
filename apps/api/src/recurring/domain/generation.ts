import type { IsoDate } from "@miplata/shared";
import { dueDatesBetween, type RecurringRule } from "./schedule";

const MS_PER_DAY = 86_400_000;

export function addDays(date: IsoDate, days: number): IsoDate {
  const shifted = new Date(Date.parse(`${date}T00:00:00Z`) + days * MS_PER_DAY);
  return shifted.toISOString().slice(0, 10);
}

export function datesToGenerate(
  rule: RecurringRule,
  latestDueOn: IsoDate | null,
  horizon: IsoDate,
): IsoDate[] {
  const from = latestDueOn === null ? rule.startsOn : addDays(latestDueOn, 1);
  return dueDatesBetween(rule, from, horizon);
}

export function earlierOf(first: IsoDate, second: IsoDate): IsoDate {
  if (first < second) {
    return first;
  }
  return second;
}
