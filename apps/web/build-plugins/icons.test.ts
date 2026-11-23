import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { brandIcons, buildIco, renderIcon } from "./icons";

const brandDir = join(import.meta.dirname, "../../../design/brand");

describe("buildIco", () => {
  it("writes an icon directory entry for each png and the png data after it", async () => {
    // Arrange
    const small = await renderIcon(await readFile(join(brandDir, "favicon.svg")), 16);
    const large = await renderIcon(await readFile(join(brandDir, "favicon.svg")), 32);

    // Act
    const ico = buildIco([
      { size: 16, png: small },
      { size: 32, png: large },
    ]);

    // Assert
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    expect(ico.readUInt8(6)).toBe(16);
    expect(ico.readUInt8(22)).toBe(32);
    expect(ico.readUInt32LE(14)).toBe(small.length);
    expect(ico.readUInt32LE(18)).toBe(38);
    expect(ico.readUInt32LE(34)).toBe(38 + small.length);
    expect(ico.subarray(38 + small.length).equals(large)).toBe(true);
  });
});

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
  it("emits every icon, the svg favicon and the ico favicon into the bundle", async () => {
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
      "favicon.ico",
    ]);
  });
});
