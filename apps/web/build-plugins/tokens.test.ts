import { describe, expect, it } from "vitest";
import { type DesignTokens, designTokens, tokensToCss } from "./tokens";

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
