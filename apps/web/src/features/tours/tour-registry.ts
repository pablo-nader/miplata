import { matchPath } from "react-router-dom";
import { accountsTour } from "../accounts/accounts-tour";
import { budgetsTour } from "../budgets/budgets-tour";
import { categoriesTour } from "../categories/categories-tour";
import { homeTour } from "../home/home-tour";
import { movementsTour } from "../movements/movements-tour";
import { newMovementTour } from "../movements/new-movement-tour";
import { recurringTour } from "../recurring/recurring-tour";
import { toPayTour } from "../recurring/to-pay-tour";
import { reportsTour } from "../reports/reports-tour";
import { statementTour } from "../statements/statement-tour";
import type { TourDefinition } from "./tour-types";

export const TOURS: readonly TourDefinition[] = [
  homeTour,
  newMovementTour,
  movementsTour,
  accountsTour,
  statementTour,
  toPayTour,
  recurringTour,
  budgetsTour,
  reportsTour,
  categoriesTour,
];

export function tourForPath(pathname: string): TourDefinition | undefined {
  return TOURS.find((tour) => matchPath({ path: tour.route, end: true }, pathname) !== null);
}
