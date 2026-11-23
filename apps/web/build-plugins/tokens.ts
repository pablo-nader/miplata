import type { Plugin } from "vite";

type Token = { $value: string | string[] };
type TokenGroup = Record<string, Token>;

export type DesignTokens = {
  theme: { light: TokenGroup; dark: TokenGroup };
  [group: string]: unknown;
};

export function themeColor(tokens: DesignTokens, scheme: "light" | "dark", name: string): string {
  const value = tokens.theme[scheme][name]?.$value;
  if (typeof value !== "string") throw new Error(`Missing ${scheme} color token "${name}"`);
  return value;
}

function formatValue(value: string | string[]): string {
  if (typeof value === "string") return value;
  return value.map((name) => (name.includes(" ") ? `"${name}"` : name)).join(", ");
}

function declarations(prefix: string, group: TokenGroup): string[] {
  return Object.entries(group).map(
    ([key, token]) => `--${prefix}-${key}: ${formatValue(token.$value)};`,
  );
}

export function tokensToCss(tokens: DesignTokens): string {
  const { theme, ...groups } = tokens;
  const shared = Object.entries(groups).flatMap(([name, group]) =>
    declarations(name, group as TokenGroup),
  );
  const light = declarations("color", theme.light);
  const dark = declarations("color", theme.dark);
  return [
    `:root {\n  color-scheme: light dark;\n  ${[...shared, ...light].join("\n  ")}\n}`,
    `@media (prefers-color-scheme: dark) {\n  :root {\n    ${dark.join("\n    ")}\n  }\n}`,
    "",
  ].join("\n");
}

export function themeColorTags(tokens: DesignTokens) {
  return [
    { tag: "meta", attrs: { name: "theme-color", content: themeColor(tokens, "light", "band") } },
    {
      tag: "meta",
      attrs: {
        name: "theme-color",
        content: themeColor(tokens, "dark", "band"),
        media: "(prefers-color-scheme: dark)",
      },
    },
  ];
}

const virtualId = "virtual:design-tokens.css";

export function designTokens(tokens: DesignTokens): Plugin {
  return {
    name: "design-tokens",
    resolveId: (id) => (id === virtualId ? `\0${virtualId}` : null),
    load: (id) => (id === `\0${virtualId}` ? tokensToCss(tokens) : null),
    transformIndexHtml: () => themeColorTags(tokens),
  };
}
