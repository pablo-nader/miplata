import { build } from "esbuild";

await build({
  entryPoints: ["src/vercel.ts"],
  outfile: "dist/vercel.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
  banner: {
    js: 'import { createRequire } from "node:module"; const require = createRequire(import.meta.url);',
  },
});
