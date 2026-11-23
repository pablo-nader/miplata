import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@brand": join(import.meta.dirname, "../../design/brand") } },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "build-plugins/**/*.test.ts"],
    setupFiles: ["src/test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "build-plugins/**/*.ts"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "src/main.tsx",
        "src/app/App.tsx",
        "src/test/**",
        "src/vite-env.d.ts",
      ],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
