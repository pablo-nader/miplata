import { describe, expect, it } from "vitest";
import { type DesignTokens, designTokens, themeColor, themeColorTags, tokensToCss } from "./tokens";

const tokens: DesignTokens = {
  theme: {
    light: { surface: { $value: "#FFFFFF" } },
    dark: { surface: { $value: "#111315" } },
  },
  space: { "1": { $value: "4px" } },
  font: { display: { $value: ["Schibsted Grotesk", "system-ui", "sans-serif"] } },
};

describe("tokensToCss", () => {
  it("emits shared tokens and the light theme on the root", () => {
    // Arrange
    const expected = ["--space-1: 4px;", "--color-surface: #FFFFFF;"];

    // Act
    const css = tokensToCss(tokens);

    // Assert
    for (const line of expected) expect(css).toContain(line);
  });

  it("quotes font families that contain spaces", () => {
    // Arrange
    const expected = '--font-display: "Schibsted Grotesk", system-ui, sans-serif;';

    // Act
    const css = tokensToCss(tokens);

    // Assert
    expect(css).toContain(expected);
  });

  it("overrides colors for the dark scheme", () => {
    // Arrange
    const expected = "@media (prefers-color-scheme: dark)";

    // Act
    const css = tokensToCss(tokens);

    // Assert
    expect(css).toContain(expected);
    expect(css).toContain("--color-surface: #111315;");
  });
});

describe("designTokens plugin", () => {
  it("serves the generated css through the virtual module", () => {
    // Arrange
    const plugin = designTokens(tokens);
    const resolve = plugin.resolveId as (id: string) => string | null;
    const load = plugin.load as (id: string) => string | null;

    // Act
    const resolved = resolve("virtual:design-tokens.css");
    const css = resolved ? load(resolved) : null;

    // Assert
    expect(css).toContain("--space-1: 4px;");
    expect(resolve("other")).toBeNull();
    expect(load("other")).toBeNull();
  });
});

describe("themeColor", () => {
  it("returns the color of an existing token", () => {
    // Arrange
    const name = "surface";

    // Act
    const value = themeColor(tokens, "dark", name);

    // Assert
    expect(value).toBe("#111315");
  });

  it("fails the build when a token is missing", () => {
    // Arrange
    const name = "band";

    // Act
    const read = () => themeColor(tokens, "light", name);

    // Assert
    expect(read).toThrow('Missing light color token "band"');
  });
});

describe("themeColorTags", () => {
  it("emits a light and a dark theme-color meta", () => {
    // Arrange
    const withBand: DesignTokens = {
      ...tokens,
      theme: { light: { band: { $value: "#202428" } }, dark: { band: { $value: "#23282D" } } },
    };

    // Act
    const tags = themeColorTags(withBand);

    // Assert
    expect(tags.map((tag) => tag.attrs.content)).toEqual(["#202428", "#23282D"]);
    expect(tags[1]?.attrs).toHaveProperty("media", "(prefers-color-scheme: dark)");
  });
});
