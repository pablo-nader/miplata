import type { Occurrence, Recurring } from "@miplata/shared";

export const TODAY = "2026-11-25";

export function makeOccurrence(overrides: Partial<Occurrence> = {}): Occurrence {
  return {
    id: "occ-rent",
    recurringId: "rec-rent",
    dueOn: TODAY,
    type: "expense",
    description: "Alquiler",
    categoryId: "cat-maintenance",
    accountId: "acc-cash",
    currency: "ARS",
    amountMode: "fixed",
    suggestedAmountMinor: 575_000_00,
    ...overrides,
  };
}

export const rent = makeOccurrence();

export const electricity = makeOccurrence({
  id: "occ-power",
  recurringId: "rec-power",
  dueOn: "2026-11-20",
  description: "Luz",
  amountMode: "variable",
  suggestedAmountMinor: 41_500_00,
});

export const internet = makeOccurrence({
  id: "occ-internet",
  recurringId: "rec-internet",
  dueOn: "2026-12-10",
  description: "Internet",
  categoryId: "cat-groceries",
  suggestedAmountMinor: 32_000_00,
});

export const salary = makeOccurrence({
  id: "occ-salary",
  recurringId: "rec-salary",
  type: "income",
  dueOn: "2026-12-05",
  description: "Sueldo",
  categoryId: "cat-salary",
  suggestedAmountMinor: 1_250_000_00,
});

export const unpriced = makeOccurrence({
  id: "occ-unpriced",
  recurringId: "rec-unpriced",
  dueOn: "2026-11-24",
  description: "Expensas",
  amountMode: "variable",
  suggestedAmountMinor: null,
});

export function occurrenceList(items: Occurrence[]) {
  return { body: { today: TODAY, items } };
}

export function makeRecurring(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: "rec-rent",
    type: "expense",
    frequency: "monthly",
    dayOfMonth: 5,
    monthOfYear: null,
    amountMode: "fixed",
    amountMinor: 575_000_00,
    currency: "ARS",
    accountId: "acc-cash",
    categoryId: "cat-maintenance",
    description: "Alquiler",
    startsOn: "2026-01-05",
    endsOn: null,
    isPaused: false,
    ...overrides,
  };
}
