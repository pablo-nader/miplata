import { describe, expect, it } from "vitest";
import { findAnchor, tourAnchor } from "./anchors";

function page(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

describe("tourAnchor", () => {
  it("returns a data attribute that is not a css class", () => {
    // Arrange
    const name = "home-balance";

    // Act
    const attributes = tourAnchor(name);

    // Assert
    expect(attributes).toEqual({ "data-tour": "home-balance" });
  });
});

describe("findAnchor", () => {
  it("returns the first rendered element carrying the anchor", () => {
    // Arrange
    const root = page('<i data-tour="add" id="hidden"></i><b data-tour="add" id="shown"></b>');

    // Act
    const found = findAnchor("add", root, (element) => element.id === "shown");

    // Assert
    expect(found?.id).toBe("shown");
  });

  it("returns null when no element carries the anchor", () => {
    // Arrange
    const root = page('<b data-tour="other"></b>');

    // Act
    const found = findAnchor("add", root, () => true);

    // Assert
    expect(found).toBeNull();
  });

  it("returns null when the anchor exists but is not rendered", () => {
    // Arrange
    const root = page('<b data-tour="add"></b>');

    // Act
    const found = findAnchor("add", root, () => false);

    // Assert
    expect(found).toBeNull();
  });

  it("treats an element without size as not rendered by default", () => {
    // Arrange
    const root = page('<b data-tour="add"></b>');

    // Act
    const found = findAnchor("add", root);

    // Assert
    expect(found).toBeNull();
  });
});
