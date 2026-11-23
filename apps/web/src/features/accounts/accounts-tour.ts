import { type TourDefinition, tourStep } from "../tours/tour-types";

export const accountsTour: TourDefinition = {
  id: "accounts",
  version: 1,
  route: "/accounts",
  steps: [
    tourStep("accounts", "intro"),
    tourStep("accounts", "add", "screen-action"),
    tourStep("accounts", "list", "accounts-list"),
    tourStep("accounts", "cards"),
  ],
};
