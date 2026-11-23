import { type TourDefinition, tourStep } from "../tours/tour-types";

export const newMovementTour: TourDefinition = {
  id: "new-movement",
  version: 1,
  route: "/movements/new",
  steps: [
    tourStep("new-movement", "type", "movement-type"),
    tourStep("new-movement", "amount", "movement-amount"),
    tourStep("new-movement", "category", "movement-category"),
    tourStep("new-movement", "account", "movement-account"),
    tourStep("new-movement", "submit", "movement-submit"),
  ],
};
