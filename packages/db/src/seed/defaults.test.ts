import { icons } from "lucide";
import { describe, expect, it } from "vitest";
import { DEFAULT_EXPENSE_GROUPS, DEFAULT_INCOME_CATEGORIES, INSTITUTION_CATALOG } from "./defaults";

const toPascal = (name: string) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const allCategories = [
  ...DEFAULT_EXPENSE_GROUPS.flatMap((group) => group.categories),
  ...DEFAULT_INCOME_CATEGORIES,
];

describe("default categories", () => {
  it("only use icons that exist in the installed Lucide version", () => {
    // Arrange
    const names = allCategories.map((item) => item.icon);

    // Act
    const unknown = names.filter((name) => !(toPascal(name) in icons));

    // Assert
    expect(unknown).toEqual([]);
  });

  it("use unique translation keys", () => {
    // Arrange
    const keys = [
      ...DEFAULT_EXPENSE_GROUPS.map((group) => group.nameKey),
      ...allCategories.map((item) => item.nameKey),
    ];

    // Act
    const unique = new Set(keys);

    // Assert
    expect(unique.size).toBe(keys.length);
  });

  it("use colors between 1 and 5", () => {
    // Arrange
    const colors = [
      ...DEFAULT_EXPENSE_GROUPS.map((group) => group.color),
      ...DEFAULT_INCOME_CATEGORIES.map((item) => item.color),
    ];

    // Act
    const invalid = colors.filter((color) => color < 1 || color > 5);

    // Assert
    expect(invalid).toEqual([]);
  });

  it("match the counts defined by the business decisions", () => {
    // Arrange
    const expenseCount = DEFAULT_EXPENSE_GROUPS.flatMap((group) => group.categories).length;

    // Act
    const groupCount = DEFAULT_EXPENSE_GROUPS.length;

    // Assert
    expect(groupCount).toBe(9);
    expect(expenseCount).toBe(36);
    expect(DEFAULT_INCOME_CATEGORIES).toHaveLength(7);
  });
});

describe("institution catalog", () => {
  it("lists 12 banks and 7 wallets with unique names", () => {
    // Arrange
    const names = INSTITUTION_CATALOG.map((item) => item.name);

    // Act
    const banks = INSTITUTION_CATALOG.filter((item) => item.kind === "bank").length;

    // Assert
    expect(banks).toBe(12);
    expect(INSTITUTION_CATALOG.length - banks).toBe(7);
    expect(new Set(names).size).toBe(names.length);
  });
});
