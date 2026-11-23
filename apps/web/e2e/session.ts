import type { Page } from "@playwright/test";

const now = new Date().toISOString();
const later = new Date(Date.now() + 86_400_000).toISOString();

export async function mockSignedIn(page: Page, locale: "es" | "en" = "es") {
  await page.route("**/api/auth/get-session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        session: {
          id: "session-1",
          userId: "user-1",
          token: "token",
          expiresAt: later,
          createdAt: now,
          updatedAt: now,
        },
        user: {
          id: "user-1",
          name: "Ana Test",
          email: "ana@example.com",
          emailVerified: true,
          image: null,
          locale,
          createdAt: now,
          updatedAt: now,
        },
      },
    }),
  );
}
