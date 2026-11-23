import { type TourDefinition, tourStep } from "../tours/tour-types";

export const toPayTour: TourDefinition = {
  id: "to-pay",
  version: 1,
  route: "/to-pay",
  steps: [
    tourStep("to-pay", "intro"),
    tourStep("to-pay", "source"),
    tourStep("to-pay", "list", "to-pay-list"),
    tourStep("to-pay", "actions"),
  ],
};
