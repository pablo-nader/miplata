import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { brandIcons, renderIcon } from "./icons";

const brandDir = join(import.meta.dirname, "../../../design/brand");

describe("renderIcon", () => {
  it("renders a square png at the requested size", async () => {
    // Arrange
    const svg = await readFile(join(brandDir, "app-icon.svg"));

    // Act
    const png = await renderIcon(svg, 192);

    // Assert
    const meta = await sharp(png).metadata();
    expect(meta).toMatchObject({ format: "png", width: 192, height: 192 });
  });
});

describe("brandIcons plugin", () => {
  it("emits every icon and the favicon into the bundle", async () => {
    // Arrange
    const emitted: string[] = [];
    const plugin = brandIcons(brandDir);
    const generate = plugin.generateBundle as unknown as (this: {
      emitFile: (file: { fileName: string }) => void;
    }) => Promise<void>;

    // Act
    await generate.call({ emitFile: (file) => emitted.push(file.fileName) });

    // Assert
    expect(emitted).toEqual([
      "icons/icon-192.png",
      "icons/icon-512.png",
      "icons/icon-maskable-512.png",
      "icons/apple-touch-icon.png",
      "favicon.svg",
    ]);
  });
});
