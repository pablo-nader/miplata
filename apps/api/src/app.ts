import { Hono } from "hono";
import type { CategoryRepository } from "./categories/application/category-repository";
import { categoriesRoutes } from "./categories/http/categories-routes";
import { categoryGroupsRoutes } from "./categories/http/category-groups-routes";
import type { VersionSource } from "./health/application/get-health";
import { healthRoutes } from "./health/http/health-routes";
import type { UserProfileRepository } from "./me/application/user-profile";
import { meRoutes } from "./me/http/me-routes";
import type { SessionResolver } from "./shared/auth/auth-middleware";

export type AppDependencies = {
  readVersion: VersionSource;
  authHandler: (request: Request) => Promise<Response>;
  resolveSession: SessionResolver;
  users: UserProfileRepository;
  categories: CategoryRepository;
};

export function createApp({
  readVersion,
  authHandler,
  resolveSession,
  users,
  categories,
}: AppDependencies) {
  return new Hono()
    .basePath("/api")
    .on(["GET", "POST"], "/auth/*", (c) => authHandler(c.req.raw))
    .route("/", healthRoutes(readVersion))
    .route("/me", meRoutes(resolveSession, users))
    .route("/categories", categoriesRoutes(resolveSession, categories))
    .route("/category-groups", categoryGroupsRoutes(resolveSession, categories));
}

export type AppType = ReturnType<typeof createApp>;
