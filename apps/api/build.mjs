import { build } from "esbuild";

await build({
  entryPoints: ["src/vercel.ts"],
  outfile: "dist/vercel.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node24",
});
