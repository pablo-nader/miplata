import {
  categoriesResponseSchema,
  categorySchema,
  createCategoryRequestSchema,
  updateCategoryRequestSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import type { CategoryRepository } from "../application/category-repository";
import {
  createCategory,
  deleteCategory,
  listCategories,
  setCategoryActive,
  updateCategory,
} from "../application/category-use-cases";
import { isValidId } from "./path-id";

export function categoriesRoutes(resolveSession: SessionResolver, repository: CategoryRepository) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) => {
      const catalog = await listCategories(repository, c.get("userId"));
      return c.json(categoriesResponseSchema.parse(catalog));
    })
    .post("/", async (c) => {
      const body = createCategoryRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json({ error: "invalid_request" }, 400);
      }
      const result = await createCategory(repository, c.get("userId"), body.data);
      if (!result.ok) {
        return c.json({ error: result.reason }, result.reason === "name_taken" ? 409 : 400);
      }
      return c.json(categorySchema.parse(result.value), 201);
    })
    .patch("/:id", async (c) => {
      if (!isValidId(c.req.param("id"))) {
        return c.json({ error: "not_found" }, 404);
      }
      const body = updateCategoryRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json({ error: "invalid_request" }, 400);
      }
      const result = await updateCategory(
        repository,
        c.get("userId"),
        c.req.param("id"),
        body.data,
      );
      if (!result.ok) {
        const status =
          result.reason === "not_found" ? 404 : result.reason === "name_taken" ? 409 : 400;
        return c.json({ error: result.reason }, status);
      }
      return c.json(categorySchema.parse(result.value));
    })
    .post("/:id/deactivate", async (c) => {
      if (!isValidId(c.req.param("id"))) {
        return c.json({ error: "not_found" }, 404);
      }
      const result = await setCategoryActive(repository, c.get("userId"), c.req.param("id"), false);
      return result.ok
        ? c.json(categorySchema.parse(result.value))
        : c.json({ error: result.reason }, 404);
    })
    .post("/:id/reactivate", async (c) => {
      if (!isValidId(c.req.param("id"))) {
        return c.json({ error: "not_found" }, 404);
      }
      const result = await setCategoryActive(repository, c.get("userId"), c.req.param("id"), true);
      return result.ok
        ? c.json(categorySchema.parse(result.value))
        : c.json({ error: result.reason }, 404);
    })
    .delete("/:id", async (c) => {
      if (!isValidId(c.req.param("id"))) {
        return c.json({ error: "not_found" }, 404);
      }
      const result = await deleteCategory(repository, c.get("userId"), c.req.param("id"));
      if (!result.ok) {
        return c.json(
          { error: result.reason === "in_use" ? "category_in_use" : "not_found" },
          result.reason === "in_use" ? 409 : 404,
        );
      }
      return c.body(null, 204);
    });
}
