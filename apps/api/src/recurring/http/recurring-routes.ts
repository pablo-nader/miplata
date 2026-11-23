import {
  confirmOccurrenceRequestSchema,
  endRecurringRequestSchema,
  movementSchema,
  occurrenceListSchema,
  occurrenceQuerySchema,
  recurringListSchema,
  recurringRequestSchema,
  recurringSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import {
  confirmOccurrence,
  createRecurring,
  endRecurring,
  getRecurring,
  listOccurrences,
  listRecurring,
  pauseRecurring,
  type RecurringDependencies,
  type RecurringError,
  resumeRecurring,
  skipOccurrence,
  updateRecurring,
} from "../application/recurring-use-cases";

const idSchema = z.uuid();

type Failure = { status: 400 | 404 | 409; body: { error: string; reason?: string } };

const invalidRequest: Failure = { status: 400, body: { error: "invalid_request" } };
const notFound: Failure = { status: 404, body: { error: "not_found" } };

const CONFLICTS: RecurringError[] = ["occurrence_resolved", "recurring_ended"];
const BAD_INPUT: RecurringError[] = ["amount_required", "invalid_range"];

function failureOf(error: RecurringError): Failure {
  if (error === "not_found") {
    return notFound;
  }
  if (CONFLICTS.includes(error)) {
    return { status: 409, body: { error } };
  }
  if (BAD_INPUT.includes(error)) {
    return { status: 400, body: { error } };
  }
  return { status: 400, body: { error: "invalid_request", reason: error } };
}

async function jsonBody(request: Request): Promise<unknown> {
  return request.json().catch(() => null);
}

export function recurringRoutes(resolveSession: SessionResolver, deps: RecurringDependencies) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) => {
      const items = await listRecurring(deps, c.get("userId"));
      return c.json(recurringListSchema.parse({ items }));
    })
    .post("/", async (c) => {
      const body = recurringRequestSchema.safeParse(await jsonBody(c.req.raw));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await createRecurring(deps, c.get("userId"), body.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(recurringSchema.parse(result.value), 201);
    })
    .get("/occurrences", async (c) => {
      const query = occurrenceQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const list = await listOccurrences(deps, c.get("userId"), query.data.type);
      return c.json(occurrenceListSchema.parse(list));
    })
    .post("/occurrences/:id/confirm", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = confirmOccurrenceRequestSchema.safeParse((await jsonBody(c.req.raw)) ?? {});
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await confirmOccurrence(deps, c.get("userId"), id.data, body.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(movementSchema.parse(result.value), 201);
    })
    .post("/occurrences/:id/skip", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const result = await skipOccurrence(deps, c.get("userId"), id.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.body(null, 204);
    })
    .get("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const result = id.success ? await getRecurring(deps, c.get("userId"), id.data) : null;
      if (!result?.ok) {
        return c.json(notFound.body, notFound.status);
      }
      return c.json(recurringSchema.parse(result.value));
    })
    .put("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = recurringRequestSchema.safeParse(await jsonBody(c.req.raw));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await updateRecurring(deps, c.get("userId"), id.data, body.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(recurringSchema.parse(result.value));
    })
    .post("/:id/pause", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const result = id.success ? await pauseRecurring(deps, c.get("userId"), id.data) : null;
      if (!result?.ok) {
        return c.json(notFound.body, notFound.status);
      }
      return c.json(recurringSchema.parse(result.value));
    })
    .post("/:id/resume", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const result = await resumeRecurring(deps, c.get("userId"), id.data);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(recurringSchema.parse(result.value));
    })
    .post("/:id/end", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = endRecurringRequestSchema.safeParse((await jsonBody(c.req.raw)) ?? {});
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await endRecurring(deps, c.get("userId"), id.data, body.data.endsOn);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(recurringSchema.parse(result.value));
    });
}
