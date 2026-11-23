import {
  accountSchema,
  accountsResponseSchema,
  balanceResponseSchema,
  createAccountRequestSchema,
  institutionsResponseSchema,
  updateAccountRequestSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import {
  type AccountRepository,
  createAccount,
  deleteAccount,
  getAccount,
  type InstitutionRepository,
  listAccounts,
  listInstitutions,
  setAccountActive,
  updateAccount,
} from "../application/accounts";
import { getBalance } from "../application/get-balance";
import { accountFailure, invalidRequest, notFound } from "./account-failure";

export type AccountRoutesDependencies = {
  accounts: AccountRepository;
  everyAccount: AccountRepository;
  institutions: InstitutionRepository;
};

const idSchema = z.uuid();

export function accountRoutes(resolveSession: SessionResolver, deps: AccountRoutesDependencies) {
  const { accounts, institutions } = deps;
  async function toggle(rawId: string, userId: string, isActive: boolean) {
    const id = idSchema.safeParse(rawId);
    const result = id.success ? await setAccountActive(accounts, userId, id.data, isActive) : null;
    if (!result?.ok) {
      return Response.json(notFound.body, { status: notFound.status });
    }
    return Response.json(accountSchema.parse(result.value));
  }

  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) =>
      c.json(accountsResponseSchema.parse(await listAccounts(accounts, c.get("userId")))),
    )
    .post("/", async (c) => {
      const body = createAccountRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const { institutionId, name, closingDay, dueDay, ...rest } = body.data;
      const result = await createAccount(accounts, institutions, c.get("userId"), {
        ...rest,
        institutionId: institutionId ?? null,
        name: name ?? null,
        closingDay: closingDay ?? null,
        dueDay: dueDay ?? null,
      });
      if (!result.ok) {
        const failure = accountFailure(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(accountSchema.parse(result.value), 201);
    })
    .get("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const result = await getAccount(accounts, c.get("userId"), id.data);
      if (!result.ok) {
        return c.json(notFound.body, notFound.status);
      }
      return c.json(accountSchema.parse(result.value));
    })
    .patch("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = updateAccountRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await updateAccount(accounts, institutions, c.get("userId"), id.data, {
        ...body.data,
      });
      if (!result.ok) {
        const failure = accountFailure(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(accountSchema.parse(result.value));
    })
    .post("/:id/deactivate", (c) => toggle(c.req.param("id"), c.get("userId"), false))
    .post("/:id/reactivate", (c) => toggle(c.req.param("id"), c.get("userId"), true))
    .delete("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const result = await deleteAccount(accounts, c.get("userId"), id.data);
      if (!result.ok) {
        const failure = accountFailure(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.body(null, 204);
    });
}

export function institutionRoutes(
  resolveSession: SessionResolver,
  institutions: InstitutionRepository,
) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) =>
      c.json(institutionsResponseSchema.parse(await listInstitutions(institutions))),
    );
}

export function balanceRoutes(resolveSession: SessionResolver, everyAccount: AccountRepository) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) =>
      c.json(balanceResponseSchema.parse(await getBalance(everyAccount, c.get("userId")))),
    );
}
