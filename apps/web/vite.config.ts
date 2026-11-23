import { readFileSync } from "node:fs";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { brandIcons } from "./build-plugins/icons.ts";
import { type DesignTokens, designTokens } from "./build-plugins/tokens.ts";

const root = join(import.meta.dirname, "../..");
const tokens: DesignTokens = JSON.parse(readFileSync(join(root, "design/tokens.json"), "utf8"));
const apiTarget = `http://localhost:${process.env.API_PORT ?? 8787}`;

export default defineConfig({
  plugins: [
    react(),
    designTokens(tokens),
    brandIcons(join(root, "design/brand")),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "miPlata",
        short_name: "miPlata",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: tokens.theme.light.band?.$value as string,
        background_color: tokens.theme.light.surface?.$value as string,
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff2,svg,png}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  resolve: { alias: { "@brand": join(root, "design/brand") } },
  server: { proxy: { "/api": apiTarget } },
  preview: { port: 4173, proxy: { "/api": apiTarget } },
});
