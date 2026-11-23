import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { type AuthVariables, authMiddleware } from "./auth-middleware";

function appWith(resolve: (headers: Headers) => Promise<string | null>) {
  return new Hono<{ Variables: AuthVariables }>()
    .use(authMiddleware(resolve))
    .get("/who", (c) => c.json({ userId: c.get("userId") }));
}

describe("authMiddleware", () => {
  it("answers 401 when there is no session", async () => {
    // Arrange
    const app = appWith(async () => null);

    // Act
    const response = await app.request("/who");

    // Assert
    expect(response.status).toBe(401);
  });

  it("exposes the session user id to the handler", async () => {
    // Arrange
    const app = appWith(async () => "user-from-session");

    // Act
    const response = await app.request("/who?userId=spoofed", {
      headers: { "x-user-id": "spoofed" },
    });

    // Assert
    expect(await response.json()).toEqual({ userId: "user-from-session" });
  });

  it("passes the request headers to the resolver", async () => {
    // Arrange
    let seen: string | null = null;
    const app = appWith(async (headers) => {
      seen = headers.get("cookie");
      return "u";
    });

    // Act
    await app.request("/who", { headers: { cookie: "a=b" } });

    // Assert
    expect(seen).toBe("a=b");
  });
});
