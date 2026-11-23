import {
  forgiveRequestSchema,
  loanDetailSchema,
  loansResponseSchema,
  movementSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import { forgiveDebt, getLoanDetail, getLoans, type LoanDependencies } from "../application/loans";

const idSchema = z.uuid();

const invalidRequest = { error: "invalid_request" } as const;
const notFound = { error: "not_found" } as const;

export function loanRoutes(resolveSession: SessionResolver, deps: LoanDependencies) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) => c.json(loansResponseSchema.parse(await getLoans(deps, c.get("userId")))))
    .get("/:personId", async (c) => {
      const id = idSchema.safeParse(c.req.param("personId"));
      const result = id.success ? await getLoanDetail(deps, c.get("userId"), id.data) : null;
      if (!result?.ok) {
        return c.json(notFound, 404);
      }
      return c.json(loanDetailSchema.parse(result.value));
    })
    .post("/:personId/forgive", async (c) => {
      const id = idSchema.safeParse(c.req.param("personId"));
      if (!id.success) {
        return c.json(notFound, 404);
      }
      const body = forgiveRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest, 400);
      }
      const result = await forgiveDebt(deps, c.get("userId"), id.data, body.data);
      if (result.ok) {
        return c.json(movementSchema.parse(result.value), 201);
      }
      if (result.error === "not_found") {
        return c.json(notFound, 404);
      }
      return c.json({ ...invalidRequest, reason: result.error }, 400);
    });
}
