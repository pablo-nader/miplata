import { type TourDefinition, tourStep } from "../tours/tour-types";

export const statementTour: TourDefinition = {
  id: "statement",
  version: 1,
  route: "/accounts/:accountId/statement",
  steps: [
    tourStep("statement", "intro"),
    tourStep("statement", "period", "statement-period"),
    tourStep("statement", "summary", "statement-summary"),
    tourStep("statement", "actions", "statement-actions"),
  ],
};
