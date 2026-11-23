import {
  adjustmentRequestSchema,
  bankFiguresRequestSchema,
  chargeRequestSchema,
  statementDatesRequestSchema,
  statementDetailSchema,
  statementListQuerySchema,
  statementListSchema,
  statementPaymentRequestSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import {
  addCharge,
  adjustStatement,
  editCharge,
  getStatement,
  listStatements,
  payStatement,
  removeCharge,
  type StatementDependencies,
  type StatementError,
  setBankFigures,
  updateStatementDates,
} from "../application/statement-use-cases";

const idSchema = z.uuid();

type Failure = { status: 400 | 404; body: { error: string; reason?: string } };

const invalidRequest: Failure = { status: 400, body: { error: "invalid_request" } };
const notFound: Failure = { status: 404, body: { error: "not_found" } };

function failureOf(error: StatementError): Failure {
  if (error === "not_found") {
    return notFound;
  }
  return { status: 400, body: { error: "invalid_request", reason: error } };
}

export function statementRoutes(resolveSession: SessionResolver, deps: StatementDependencies) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) => {
      const query = statementListQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await listStatements(deps, c.get("userId"), query.data.accountId);
      if (!result.ok) {
        const failure = failureOf(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(statementListSchema.parse({ items: result.value }));
    })
    .get("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const result = id.success ? await getStatement(deps, c.get("userId"), id.data) : null;
      if (!result?.ok) {
        return c.json(notFound.body, notFound.status);
      }
      return c.json(statementDetailSchema.parse(result.value));
    })
    .patch("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const body = statementDatesRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await updateStatementDates(deps, c.get("userId"), id.data, body.data);
      return respond(c, result);
    })
    .put("/:id/bank-figures", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const body = bankFiguresRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      return respond(c, await setBankFigures(deps, c.get("userId"), id.data, body.data));
    })
    .post("/:id/charges", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const body = chargeRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      return respond(c, await addCharge(deps, c.get("userId"), id.data, body.data), 201);
    })
    .put("/:id/charges/:movementId", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const movementId = idSchema.safeParse(c.req.param("movementId"));
      if (!id.success || !movementId.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = chargeRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await editCharge(deps, c.get("userId"), id.data, movementId.data, body.data);
      return respond(c, result);
    })
    .delete("/:id/charges/:movementId", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const movementId = idSchema.safeParse(c.req.param("movementId"));
      if (!id.success || !movementId.success) {
        return c.json(notFound.body, notFound.status);
      }
      return respond(c, await removeCharge(deps, c.get("userId"), id.data, movementId.data));
    })
    .post("/:id/payments", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const body = statementPaymentRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      return respond(c, await payStatement(deps, c.get("userId"), id.data, body.data), 201);
    })
    .post("/:id/adjustment", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const body = adjustmentRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      return respond(c, await adjustStatement(deps, c.get("userId"), id.data, body.data));
    });
}

type Responder = {
  json: (body: unknown, status?: 200 | 201 | 400 | 404) => Response;
};

function respond(
  c: Responder,
  result: Awaited<ReturnType<typeof getStatement>>,
  status: 200 | 201 = 200,
): Response {
  if (!result.ok) {
    const failure = failureOf(result.error);
    return c.json(failure.body, failure.status);
  }
  return c.json(statementDetailSchema.parse(result.value), status);
}
