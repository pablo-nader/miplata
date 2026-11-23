import {
  changesQuerySchema,
  changesReportSchema,
  committedQuerySchema,
  committedReportSchema,
  monthlyQuerySchema,
  monthlyReportSchema,
  spendingMovementsQuerySchema,
  spendingMovementsSchema,
  spendingQuerySchema,
  spendingReportSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import {
  getChanges,
  getCommitted,
  getMonthly,
  getSpending,
  getSpendingMovements,
  type ReportDependencies,
} from "../application/report-use-cases";

const invalidRequest = { error: "invalid_request" } as const;

export function reportRoutes(resolveSession: SessionResolver, deps: ReportDependencies) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/spending", async (c) => {
      const query = spendingQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest, 400);
      }
      return c.json(
        spendingReportSchema.parse(await getSpending(deps, c.get("userId"), query.data)),
      );
    })
    .get("/spending/movements", async (c) => {
      const query = spendingMovementsQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest, 400);
      }
      const items = await getSpendingMovements(deps, c.get("userId"), query.data);
      return c.json(spendingMovementsSchema.parse({ items }));
    })
    .get("/monthly", async (c) => {
      const query = monthlyQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest, 400);
      }
      return c.json(monthlyReportSchema.parse(await getMonthly(deps, c.get("userId"), query.data)));
    })
    .get("/changes", async (c) => {
      const query = changesQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest, 400);
      }
      return c.json(changesReportSchema.parse(await getChanges(deps, c.get("userId"), query.data)));
    })
    .get("/committed", async (c) => {
      const query = committedQuerySchema.safeParse(c.req.query());
      if (!query.success) {
        return c.json(invalidRequest, 400);
      }
      return c.json(
        committedReportSchema.parse(await getCommitted(deps, c.get("userId"), query.data)),
      );
    });
}
