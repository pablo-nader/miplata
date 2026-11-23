import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderIcon } from "./icons";

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
