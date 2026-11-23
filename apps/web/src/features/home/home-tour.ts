import { type TourDefinition, tourStep } from "../tours/tour-types";

export const homeTour: TourDefinition = {
  id: "home",
  version: 1,
  route: "/home",
  steps: [
    tourStep("home", "welcome"),
    tourStep("home", "balance", "home-balance"),
    tourStep("home", "month", "home-month"),
    tourStep("home", "add", "nav-new-movement"),
    tourStep("home", "menu", "home-menu"),
  ],
};
