import { Hono } from "hono";
import type { AccountRepository } from "./accounts/application/accounts";
import {
  type AccountRoutesDependencies,
  accountRoutes,
  balanceRoutes,
  institutionRoutes,
} from "./accounts/http/account-routes";
import type { CategoryRepository } from "./categories/application/category-repository";
import { categoriesRoutes } from "./categories/http/categories-routes";
import { categoryGroupsRoutes } from "./categories/http/category-groups-routes";
import type { VersionSource } from "./health/application/get-health";
import { healthRoutes } from "./health/http/health-routes";
import type { UserProfileRepository } from "./me/application/user-profile";
import { meRoutes } from "./me/http/me-routes";
import type { MovementRepository } from "./movements/application/movement-repository";
import { movementRoutes } from "./movements/http/movement-routes";
import { peopleRoutes } from "./people/http/people-routes";
import type { ReportRepository } from "./reports/application/report-repository";
import type { RecurringCommitments } from "./reports/application/report-use-cases";
import { reportRoutes } from "./reports/http/report-routes";
import type { SessionResolver } from "./shared/auth/auth-middleware";

export type AppDependencies = {
  readVersion: VersionSource;
  authHandler: (request: Request) => Promise<Response>;
  resolveSession: SessionResolver;
  users: UserProfileRepository;
  categories: CategoryRepository;
  accounts: AccountRoutesDependencies;
  people: AccountRepository;
  movements: MovementRepository;
  reports: ReportRepository;
  recurringCommitments?: RecurringCommitments;
};

export function createApp({
  readVersion,
  authHandler,
  resolveSession,
  users,
  categories,
  accounts,
  people,
  movements,
  reports,
  recurringCommitments,
}: AppDependencies) {
  return new Hono()
    .basePath("/api")
    .on(["GET", "POST"], "/auth/*", (c) => authHandler(c.req.raw))
    .route("/", healthRoutes(readVersion))
    .route("/me", meRoutes(resolveSession, users))
    .route("/categories", categoriesRoutes(resolveSession, categories))
    .route("/category-groups", categoryGroupsRoutes(resolveSession, categories))
    .route("/accounts", accountRoutes(resolveSession, accounts))
    .route("/institutions", institutionRoutes(resolveSession, accounts.institutions))
    .route("/balance", balanceRoutes(resolveSession, accounts.everyAccount))
    .route("/people", peopleRoutes(resolveSession, people))
    .route(
      "/movements",
      movementRoutes(resolveSession, {
        movements,
        accounts: accounts.everyAccount,
        categories,
      }),
    )
    .route("/reports", reportRoutes(resolveSession, { reports, recurring: recurringCommitments }));
}

export type AppType = ReturnType<typeof createApp>;
