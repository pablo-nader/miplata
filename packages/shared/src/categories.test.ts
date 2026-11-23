import { describe, expect, it } from "vitest";
import {
  CATEGORY_ICON_NAMES,
  categoryLabel,
  createCategoryRequestSchema,
  groupRequestSchema,
  NAME_MAX_LENGTH,
  normalizeName,
  updateCategoryRequestSchema,
} from "./categories";

describe("normalizeName", () => {
  it("trims and collapses inner whitespace", () => {
    // Arrange
    const raw = "  Dentist \t  visits  ";

    // Act
    const name = normalizeName(raw);

    // Assert
    expect(name).toBe("Dentist visits");
  });
});

describe("category icons", () => {
  it("has no duplicates", () => {
    // Arrange
    const names = [...CATEGORY_ICON_NAMES];

    // Act
    const unique = new Set(names);

    // Assert
    expect(unique.size).toBe(names.length);
  });
});

describe("createCategoryRequestSchema", () => {
  const valid = {
    type: "expense",
    groupId: "6f1c1b1e-0000-4000-8000-000000000001",
    name: " Pets ",
    icon: "paw-print",
    color: 2,
  };

  it("accepts a valid request and normalizes the name", () => {
    // Arrange
    const input = valid;

    // Act
    const parsed = createCategoryRequestSchema.safeParse(input);

    // Assert
    expect(parsed.success && parsed.data.name).toBe("Pets");
  });

  it("accepts a null icon", () => {
    // Arrange
    const input = { ...valid, icon: null };

    // Act
    const parsed = createCategoryRequestSchema.safeParse(input);

    // Assert
    expect(parsed.success).toBe(true);
  });

  it.each([
    ["an empty name", { ...valid, name: "   " }],
    ["a name that is too long", { ...valid, name: "x".repeat(NAME_MAX_LENGTH + 1) }],
    ["an icon outside the curated set", { ...valid, icon: "skull" }],
    ["a color below 1", { ...valid, color: 0 }],
    ["a color above 5", { ...valid, color: 6 }],
    ["a fractional color", { ...valid, color: 1.5 }],
    ["an unknown type", { ...valid, type: "transfer" }],
    ["a missing icon", { type: "income", name: "Prize", color: 1 }],
  ])("rejects %s", (_label, input) => {
    // Arrange
    const candidate = input;

    // Act
    const parsed = createCategoryRequestSchema.safeParse(candidate);

    // Assert
    expect(parsed.success).toBe(false);
  });
});

describe("updateCategoryRequestSchema", () => {
  it("rejects an empty patch", () => {
    // Arrange
    const input = {};

    // Act
    const parsed = updateCategoryRequestSchema.safeParse(input);

    // Assert
    expect(parsed.success).toBe(false);
  });

  it("accepts clearing the icon", () => {
    // Arrange
    const input = { icon: null };

    // Act
    const parsed = updateCategoryRequestSchema.safeParse(input);

    // Assert
    expect(parsed.success).toBe(true);
  });
});

describe("groupRequestSchema", () => {
  it("rejects a blank name", () => {
    // Arrange
    const input = { name: " " };

    // Act
    const parsed = groupRequestSchema.safeParse(input);

    // Assert
    expect(parsed.success).toBe(false);
  });
});

describe("categoryLabel", () => {
  const translate = (key: string) => `t:${key}`;

  it("shows the translated key until the item is renamed", () => {
    // Arrange
    const item = { name: null, nameKey: "defaults.category.rent" };

    // Act
    const label = categoryLabel(item, translate);

    // Assert
    expect(label).toBe("t:defaults.category.rent");
  });

  it("shows the custom name once it exists", () => {
    // Arrange
    const item = { name: "Alquiler", nameKey: null };

    // Act
    const label = categoryLabel(item, translate);

    // Assert
    expect(label).toBe("Alquiler");
  });

  it("is empty when neither exists", () => {
    // Arrange
    const item = { name: null, nameKey: null };

    // Act
    const label = categoryLabel(item, translate);

    // Assert
    expect(label).toBe("");
  });
});
