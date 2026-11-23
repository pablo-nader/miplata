import type { Occurrence, Recurring } from "@miplata/shared";
import type { MoneyLocale } from "../../ui/format/money";

export type RecurringStatus = "active" | "paused" | "ended";

export type DueKind = "overdue" | "today" | "upcoming";

export type OccurrenceSections = {
  due: Occurrence[];
  upcoming: Occurrence[];
  receivable: Occurrence[];
};

export function dueKind(dueOn: string, today: string): DueKind {
  if (dueOn < today) {
    return "overdue";
  }
  return dueOn === today ? "today" : "upcoming";
}

export function shortDate(isoDate: string, locale: MoneyLocale): string {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

export function sectionsOf(items: readonly Occurrence[], today: string): OccurrenceSections {
  const sorted = [...items].sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  return {
    due: sorted.filter((item) => item.type === "expense" && item.dueOn <= today),
    upcoming: sorted.filter((item) => item.type === "expense" && item.dueOn > today),
    receivable: sorted.filter((item) => item.type === "income"),
  };
}

export function pendingExpenses(items: readonly Occurrence[], today: string): Occurrence[] {
  return sectionsOf(items, today).due;
}

export function confirmDate(occurrence: Pick<Occurrence, "dueOn">, today: string): string {
  return occurrence.dueOn < today ? occurrence.dueOn : today;
}

export function statusOf(recurring: Recurring, today: string): RecurringStatus {
  if (recurring.endsOn !== null && recurring.endsOn <= today) {
    return "ended";
  }
  return recurring.isPaused ? "paused" : "active";
}

export function failureKey(error: string, known: ReadonlySet<string>, fallback: string): string {
  return known.has(error) ? error : fallback;
}
