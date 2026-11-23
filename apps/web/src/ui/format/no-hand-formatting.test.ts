import { describe, expect, it } from "vitest";

const sources = import.meta.glob("../../**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const FORBIDDEN = /\.toFixed\(|\.toLocaleString\(|Intl\.NumberFormat|Intl\.PluralRules/;

const ALLOWED = ["/money.ts", "/report-view.ts"];

function isProduction(path: string): boolean {
  return !/\.test\.tsx?$/.test(path) && !path.includes("/test/");
}

describe("amount formatting", () => {
  it("lives in the shared money utilities", () => {
    const offenders = Object.entries(sources)
      .filter(([path]) => isProduction(path))
      .filter(([path]) => !ALLOWED.some((allowed) => `/${path}`.endsWith(allowed)))
      .filter(([, source]) => FORBIDDEN.test(source))
      .map(([path]) => path);

    expect(offenders).toEqual([]);
  });
});
