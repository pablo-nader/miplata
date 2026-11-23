import {
  monthSummaryQuerySchema,
  monthSummarySchema,
  movementListSchema,
  movementQuerySchema,
  movementRequestSchema,
  movementSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import {
  createMovement,
  deleteMovement,
  getMonthSummary,
  getMovement,
  listMovements,
  type MovementDependencies,
  type MovementError,
  updateMovement,
} from "../application/movement-use-cases";

const idSchema = z.uuid();

type Failure = { status: 400 | 404 | 409; body: { error: string; reason?: string } };

const invalidRequest: Failure = { status: 400, body: { error: "invalid_request" } };
const notFound: Failure = { status: 404, body: { error: "not_found" } };

function failureOf(error: MovementError): Failure {
  if (error === "not_found") {
    return notFound;
  }
  if (error === "movement_in_use" || error === "statement_movement") {
    return { status: 409, body: { error } };
  }
  return { status: 400, body: { error: "invalid_request", reason: error } };
}

export function movementRoutes(resolveSession: SessionResolver, deps: MovementDependencies) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) => {
      const query = movementQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const page = await listMovements(deps.movements, c.get("userId"), query.data);
      return c.json(movementListSchema.parse(page));
    })
    .get("/summary", async (c) => {
      const query = monthSummaryQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const summary = await getMonthSummary(deps.movements, c.get("userId"), query.data.month);
      return c.json(monthSummarySchema.parse(summary));
    })
    .post("/", async (c) => {
      const body = movementRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await createMovement(deps, c.get("userId"), body.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(movementSchema.parse(result.value), 201);
    })
    .get("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const result = id.success
        ? await getMovement(deps.movements, c.get("userId"), id.data)
        : null;
      if (!result?.ok) {
        return c.json(notFound.body, notFound.status);
      }
      return c.json(movementSchema.parse(result.value));
    })
    .put("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = movementRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await updateMovement(deps, c.get("userId"), id.data, body.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(movementSchema.parse(result.value));
    })
    .delete("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const result = await deleteMovement(deps.movements, c.get("userId"), id.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.body(null, 204);
    });
}
