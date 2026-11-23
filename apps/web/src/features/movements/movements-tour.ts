import { type TourDefinition, tourStep } from "../tours/tour-types";

export const movementsTour: TourDefinition = {
  id: "movements",
  version: 1,
  route: "/movements",
  steps: [
    tourStep("movements", "intro"),
    tourStep("movements", "search", "movements-search"),
    tourStep("movements", "filters", "movements-filters"),
    tourStep("movements", "list", "movements-list"),
    tourStep("movements", "add", "nav-new-movement"),
  ],
};
