import { type TourDefinition, tourStep } from "../tours/tour-types";

export const reportsTour: TourDefinition = {
  id: "reports",
  version: 1,
  route: "/reports",
  steps: [
    tourStep("reports", "intro"),
    tourStep("reports", "tabs", "reports-tabs"),
    tourStep("reports", "currency", "reports-currency"),
    tourStep("reports", "filters", "reports-filters"),
  ],
};
