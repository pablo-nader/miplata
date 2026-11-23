import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import type { Plugin } from "vite";

type IconSpec = { source: string; file: string; size: number };

export const iconSpecs: IconSpec[] = [
  { source: "app-icon.svg", file: "icons/icon-192.png", size: 192 },
  { source: "app-icon.svg", file: "icons/icon-512.png", size: 512 },
  { source: "app-icon-maskable.svg", file: "icons/icon-maskable-512.png", size: 512 },
  { source: "app-icon.svg", file: "icons/apple-touch-icon.png", size: 180 },
];

export async function renderIcon(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

export function brandIcons(brandDir: string): Plugin {
  return {
    name: "brand-icons",
    async generateBundle() {
      for (const spec of iconSpecs) {
        const svg = await readFile(join(brandDir, spec.source));
        const source = await renderIcon(svg, spec.size);
        this.emitFile({ type: "asset", fileName: spec.file, source });
      }
      const favicon = await readFile(join(brandDir, "favicon.svg"));
      this.emitFile({ type: "asset", fileName: "favicon.svg", source: favicon });
    },
  };
}
