import { type TourDefinition, tourStep } from "../tours/tour-types";

export const recurringTour: TourDefinition = {
  id: "recurring",
  version: 1,
  route: "/recurring",
  steps: [
    tourStep("recurring", "intro"),
    tourStep("recurring", "add", "screen-action"),
    tourStep("recurring", "list", "recurring-list"),
    tourStep("recurring", "flow"),
  ],
};
