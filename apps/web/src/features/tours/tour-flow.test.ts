import { describe, expect, it } from "vitest";
import { isTyping, resolveSteps } from "./tour-flow";
import type { TourDefinition } from "./tour-types";

const tour: TourDefinition = {
  id: "home",
  version: 1,
  route: "/home",
  steps: [
    { title: "a", body: "a" },
    { anchor: "present", title: "b", body: "b" },
    { anchor: "missing", title: "c", body: "c" },
  ],
};

describe("resolveSteps", () => {
  it("keeps steps without an anchor and steps whose anchor is on screen", () => {
    // Arrange
    const find = (anchor: string) => (anchor === "present" ? document.body : null);

    // Act
    const steps = resolveSteps(tour, find);

    // Assert
    expect(steps.map((step) => step.title)).toEqual(["a", "b"]);
  });
});

describe("isTyping", () => {
  it("is true for inputs, text areas and selects only", () => {
    // Arrange
    const elements = [
      document.createElement("input"),
      document.createElement("textarea"),
      document.createElement("select"),
      document.createElement("button"),
    ];

    // Act
    const flags = elements.map((element) => isTyping(element));

    // Assert
    expect(flags).toEqual([true, true, true, false]);
    expect(isTyping(null)).toBe(false);
  });
});
