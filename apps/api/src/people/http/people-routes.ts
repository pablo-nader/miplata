import {
  accountSchema,
  accountsResponseSchema,
  createPersonRequestSchema,
  updatePersonRequestSchema,
} from "@miplata/shared";
import { Hono } from "hono";
import { z } from "zod";
import {
  type AccountRepository,
  deleteAccount,
  getAccount,
  listAccounts,
  setAccountActive,
} from "../../accounts/application/accounts";
import { accountFailure, invalidRequest, notFound } from "../../accounts/http/account-failure";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import { createPerson, updatePerson } from "../application/people";

const idSchema = z.uuid();

export function peopleRoutes(resolveSession: SessionResolver, people: AccountRepository) {
  async function toggle(rawId: string, userId: string, isActive: boolean) {
    const id = idSchema.safeParse(rawId);
    const result = id.success ? await setAccountActive(people, userId, id.data, isActive) : null;
    if (!result?.ok) {
      return Response.json(notFound.body, { status: notFound.status });
    }
    return Response.json(accountSchema.parse(result.value));
  }

  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) =>
      c.json(accountsResponseSchema.parse(await listAccounts(people, c.get("userId")))),
    )
    .post("/", async (c) => {
      const body = createPersonRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await createPerson(people, c.get("userId"), body.data);
      if (!result.ok) {
        const failure = accountFailure(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.json(accountSchema.parse(result.value), 201);
    })
    .get("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      const result = id.success ? await getAccount(people, c.get("userId"), id.data) : null;
      if (!result?.ok) {
        return c.json(notFound.body, notFound.status);
      }
      return c.json(accountSchema.parse(result.value));
    })
    .patch("/:id", async (c) => {
      const id = idSchema.safeParse(c.req.param("id"));
      if (!id.success) {
        return c.json(notFound.body, notFound.status);
      }
      const body = updatePersonRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json(invalidRequest.body, invalidRequest.status);
      }
      const result = await updatePerson(people, c.get("userId"), id.data, body.data);
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
      const result = await deleteAccount(people, c.get("userId"), id.data);
      if (!result.ok) {
        const failure = accountFailure(result.error);
        return c.json(failure.body, failure.status);
      }
      return c.body(null, 204);
    });
}
