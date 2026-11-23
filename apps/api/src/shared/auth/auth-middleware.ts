import { createMiddleware } from "hono/factory";

export type SessionResolver = (headers: Headers) => Promise<string | null>;

export type AuthVariables = { userId: string };

export function authMiddleware(resolveSession: SessionResolver) {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    const userId = await resolveSession(c.req.raw.headers);
    if (!userId) {
      return c.json({ error: "unauthorized" }, 401);
    }
    c.set("userId", userId);
    await next();
  });
}
