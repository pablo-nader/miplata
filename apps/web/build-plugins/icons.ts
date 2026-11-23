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

export const faviconSizes = [16, 32, 48];

export async function renderIcon(svg: Buffer, size: number): Promise<Buffer> {
  return sharp(svg, { density: 384 }).resize(size, size).png().toBuffer();
}

export function buildIco(images: { size: number; png: Buffer }[]): Buffer {
  const headerSize = 6 + images.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = headerSize;
  images.forEach(({ size, png }, index) => {
    const entry = 6 + index * 16;
    const dimension = size >= 256 ? 0 : size;
    header.writeUInt8(dimension, entry);
    header.writeUInt8(dimension, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((image) => image.png)]);
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
      const images = await Promise.all(
        faviconSizes.map(async (size) => ({ size, png: await renderIcon(favicon, size) })),
      );
      this.emitFile({ type: "asset", fileName: "favicon.ico", source: buildIco(images) });
    },
  };
}
