import {
  budgetRequestSchema,
  budgetSchema,
  budgetsQuerySchema,
  budgetsResponseSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import {
  type BudgetDependencies,
  type BudgetError,
  createBudget,
  deleteBudget,
  listBudgetProgress,
  updateBudget,
} from "../application/budget-use-cases";

const idSchema = z.uuid();

type Failure = { status: 400 | 404 | 409; body: { error: string; reason?: string } };

const invalidRequest: Failure = { status: 400, body: { error: "invalid_request" } };
const notFound: Failure = { status: 404, body: { error: "not_found" } };

function failureOf(error: BudgetError): Failure {
  if (error === "not_found") {
    return notFound;
  }
  if (error === "budget_exists") {
    return { status: 409, body: { error } };
  }
  return { status: 400, body: { error: "invalid_request", reason: error } };
}

export function budgetRoutes(resolveSession: SessionResolver, deps: BudgetDependencies) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) => {
      const query = budgetsQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const response = await listBudgetProgress(
        deps,
        c.get("userId"),
        query.data.month,
        query.data.attention,
      );
      return c.json(budgetsResponseSchema.parse(response));
    })
    .post("/", async (c) => {
      const body = budgetRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await createBudget(deps, c.get("userId"), body.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(budgetSchema.parse(result.value), 201);
    })
    .put("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = budgetRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await updateBudget(deps, c.get("userId"), id.data, body.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(budgetSchema.parse(result.value));
    })
    .delete("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const result = await deleteBudget(deps.budgets, c.get("userId"), id.data);
      if (!result.ok) {
        return c.json(notFound.body, notFound.status);
      }
      return c.body(null, 204);
    });
}
