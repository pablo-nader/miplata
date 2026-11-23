import { describe, expect, it } from "vitest";
import { resources } from "../../app/i18n";
import { TOUR_IDS } from "./tour-ids";
import { TOURS, tourForPath } from "./tour-registry";

const sources = import.meta.glob("../../**/*.tsx", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

function lookup(tree: unknown, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    return typeof node === "object" && node !== null
      ? (node as Record<string, unknown>)[part]
      : undefined;
  }, tree);
}

describe("tour registry", () => {
  it("defines exactly one tour for every tour id", () => {
    // Arrange
    const defined = TOURS.map((tour) => tour.id).sort();

    // Act
    const expected = [...TOUR_IDS].sort();

    // Assert
    expect(defined).toEqual(expected);
  });

  it("keeps every tour between three and five steps", () => {
    // Arrange
    const sizes = TOURS.map((tour) => tour.steps.length);

    // Act
    const outOfRange = sizes.filter((size) => size < 3 || size > 5);

    // Assert
    expect(outOfRange).toEqual([]);
  });

  it("has copy in both languages for every step and every screen name", () => {
    // Arrange
    const keys = TOURS.flatMap((tour) => [
      `tours.names.${tour.id}`,
      ...tour.steps.flatMap((step) => [step.title, step.body]),
    ]);

    // Act
    const missing = keys.filter(
      (key) =>
        typeof lookup(resources.es.translation, key) !== "string" ||
        typeof lookup(resources.en.translation, key) !== "string",
    );

    // Assert
    expect(missing).toEqual([]);
  });

  it("renders every anchor a tour points at", () => {
    // Arrange
    const code = Object.values(sources).join("\n");
    const anchors = TOURS.flatMap((tour) => tour.steps.flatMap((step) => step.anchor ?? []));

    // Act
    const unrendered = anchors.filter(
      (anchor) => !code.includes(`tourAnchor("${anchor}")`) && !code.includes(`anchor="${anchor}"`),
    );

    // Assert
    expect(unrendered).toEqual([]);
  });

  it("finds the tour of each main screen and none for the rest", () => {
    // Arrange
    const paths = [
      "/home",
      "/movements/new",
      "/movements",
      "/accounts",
      "/accounts/abc/statement",
      "/to-pay",
      "/recurring",
      "/budgets",
      "/reports",
      "/categories",
    ];

    // Act
    const found = paths.map((path) => tourForPath(path)?.id);

    // Assert
    expect(found).toEqual([...TOUR_IDS]);
    expect(tourForPath("/menu")).toBeUndefined();
    expect(tourForPath("/movements/123/edit")).toBeUndefined();
    expect(tourForPath("/accounts/abc/statement/pay")).toBeUndefined();
  });
});
