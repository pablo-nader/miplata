import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "pnpm --filter @miplata/api exec tsx src/dev-server.ts",
      url: "http://localhost:8787/api/health",
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ?? "postgres://miplata:miplata@localhost:5432/miplata_test",
        BETTER_AUTH_SECRET: "e2e-only-secret-that-is-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:4173",
        GOOGLE_CLIENT_ID: "e2e-client-id",
        GOOGLE_CLIENT_SECRET: "e2e-client-secret",
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @miplata/web preview",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
