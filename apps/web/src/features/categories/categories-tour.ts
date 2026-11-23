import { type TourDefinition, tourStep } from "../tours/tour-types";

export const categoriesTour: TourDefinition = {
  id: "categories",
  version: 1,
  route: "/categories",
  steps: [
    tourStep("categories", "intro"),
    tourStep("categories", "tabs", "categories-tabs"),
    tourStep("categories", "list", "categories-list"),
    tourStep("categories", "add", "categories-add"),
  ],
};
