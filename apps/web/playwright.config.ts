import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: [
    {
      command: "pnpm --filter @miplata/api exec tsx src/dev-server.ts",
      url: "http://localhost:8787/api/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm --filter @miplata/web preview",
      url: "http://localhost:4173",
      reuseExistingServer: !process.env.CI,
    },
  ],
});
