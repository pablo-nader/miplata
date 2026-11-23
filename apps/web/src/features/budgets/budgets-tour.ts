import { type TourDefinition, tourStep } from "../tours/tour-types";

export const budgetsTour: TourDefinition = {
  id: "budgets",
  version: 1,
  route: "/budgets",
  steps: [
    tourStep("budgets", "intro"),
    tourStep("budgets", "add", "screen-action"),
    tourStep("budgets", "list", "budgets-list"),
    tourStep("budgets", "home"),
  ],
};
