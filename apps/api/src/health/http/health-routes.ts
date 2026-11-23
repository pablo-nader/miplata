import { healthResponseSchema } from "@miplata/shared";
import { Hono } from "hono";
import { getHealth, type VersionSource } from "../application/get-health";

export function healthRoutes(readVersion: VersionSource) {
  return new Hono().get("/health", (c) =>
    c.json(healthResponseSchema.parse(getHealth(readVersion))),
  );
}
