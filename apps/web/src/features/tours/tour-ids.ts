export const TOUR_IDS = [
  "home",
  "new-movement",
  "movements",
  "accounts",
  "statement",
  "to-pay",
  "recurring",
  "budgets",
  "reports",
  "categories",
] as const;

export type TourId = (typeof TOUR_IDS)[number];
