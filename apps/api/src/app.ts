import { Hono } from "hono";
import type { VersionSource } from "./health/application/get-health";
import { healthRoutes } from "./health/http/health-routes";

export function createApp(readVersion: VersionSource) {
  return new Hono().basePath("/api").route("/", healthRoutes(readVersion));
}

export type AppType = ReturnType<typeof createApp>;
