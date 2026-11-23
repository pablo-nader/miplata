import { addDays, type IsoDate } from "@miplata/shared";
import { dueDatesBetween, type RecurringRule } from "./schedule";

export { addDays };

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
