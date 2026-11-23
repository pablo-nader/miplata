import { meResponseSchema, updateLocaleRequestSchema } from "@miplata/shared";
import { Hono } from "hono";
import {
  type AuthVariables,
  authMiddleware,
  type SessionResolver,
} from "../../shared/auth/auth-middleware";
import { getMe, type UserProfileRepository, updateLocale } from "../application/user-profile";

export function meRoutes(resolveSession: SessionResolver, users: UserProfileRepository) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolveSession))
    .get("/", async (c) => {
      const profile = await getMe(users, c.get("userId"));
      if (!profile) {
        return c.json({ error: "unauthorized" }, 401);
      }
      return c.json(meResponseSchema.parse(profile));
    })
    .patch("/locale", async (c) => {
      const body = updateLocaleRequestSchema.safeParse(await c.req.json().catch(() => null));
      if (!body.success) {
        return c.json({ error: "invalid_request" }, 400);
      }
      const profile = await updateLocale(users, c.get("userId"), body.data.locale);
      if (!profile) {
        return c.json({ error: "unauthorized" }, 401);
      }
      return c.json(meResponseSchema.parse(profile));
    });
}
