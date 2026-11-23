import { categoryGroupSchema, groupRequestSchema } from "@miplata/shared";
import { Hono } from "hono";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import type { CategoryRepository } from "../application/category-repository";
import { createGroup, deleteGroup, renameGroup } from "../application/group-use-cases";
import { isValidId } from "./path-id";

export function categoryGroupsRoutes(
  resolveSession: SessionResolver,
  repository: CategoryRepository,
) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .post("/", async (c) => {
      const body = groupRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json({ error: "invalid_request" }, 400);
      }
      const result = await createGroup(repository, c.get("userId"), body.data.name);
      return result.ok
        ? c.json(categoryGroupSchema.parse(result.value), 201)
        : c.json({ error: result.reason }, 409);
    })
    .patch("/:id", async (c) => {
      if (!isValidId(c.req.param("id"))) {
        return c.json({ error: "not_found" }, 404);
      }
      const body = groupRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json({ error: "invalid_request" }, 400);
      }
      const result = await renameGroup(
        repository,
        c.get("userId"),
        c.req.param("id"),
        body.data.name,
      );
      if (!result.ok) {
        return c.json({ error: result.reason }, result.reason === "not_found" ? 404 : 409);
      }
      return c.json(categoryGroupSchema.parse(result.value));
    })
    .delete("/:id", async (c) => {
      if (!isValidId(c.req.param("id"))) {
        return c.json({ error: "not_found" }, 404);
      }
      const result = await deleteGroup(repository, c.get("userId"), c.req.param("id"));
      if (!result.ok) {
        return c.json(
          { error: result.reason === "not_empty" ? "group_not_empty" : "not_found" },
          result.reason === "not_empty" ? 409 : 404,
        );
      }
      return c.body(null, 204);
    });
}
