import { dateInMonth, type IsoDate, monthOf, type YearMonth } from "@miplata/shared";
import { dueDatesBetween, type RecurringRule } from "../../recurring/domain/schedule";

export type CommittedTemplate = {
  recurringId: string;
  rule: RecurringRule;
  estimateMinor: number | null;
};

export type ResolvedOccurrence = { recurringId: string; dueOn: IsoDate };

export function recurringByMonth(
  templates: readonly CommittedTemplate[],
  resolved: readonly ResolvedOccurrence[],
  from: YearMonth,
  to: YearMonth,
): Map<YearMonth, number> {
  const closed = new Set(resolved.map((item) => `${item.recurringId}:${item.dueOn}`));
  const totals = new Map<YearMonth, number>();
  for (const template of templates) {
    if (template.estimateMinor === null) {
      continue;
    }
    const dates = dueDatesBetween(template.rule, `${from}-01`, dateInMonth(to, 31));
    for (const dueOn of dates) {
      if (!closed.has(`${template.recurringId}:${dueOn}`)) {
        const month = monthOf(dueOn);
        totals.set(month, (totals.get(month) ?? 0) + template.estimateMinor);
      }
    }
  }
  return new Map([...totals].sort(([a], [b]) => a.localeCompare(b)));
}
