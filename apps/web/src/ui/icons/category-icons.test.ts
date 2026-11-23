import { CATEGORY_ICON_NAMES } from "@miplata/shared";
import * as lucide from "lucide-react";
import { describe, expect, it } from "vitest";
import { categoryIcons, resolveCategoryIcon } from "./category-icons";

const adr0012Names = [
  "building",
  "key",
  "hammer",
  "shield",
  "zap",
  "flame",
  "droplet",
  "wifi",
  "smartphone",
  "tv",
  "landmark",
  "building-2",
  "id-card",
  "shopping-cart",
  "utensils",
  "fuel",
  "car",
  "square-parking",
  "wrench",
  "bus",
  "heart-pulse",
  "pill",
  "stethoscope",
  "party-popper",
  "shirt",
  "dumbbell",
  "graduation-cap",
  "gift",
  "paw-print",
  "plane",
  "ellipsis",
  "briefcase",
  "banknote",
  "laptop",
  "key-round",
  "trending-up",
  "undo-2",
];

const bd0015Names = ["percent", "receipt", "badge-dollar-sign", "shield-check", "scale"];

const defaultNames = [...adr0012Names, ...bd0015Names];

function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function lucideExport(name: string): unknown {
  return (lucide as Record<string, unknown>)[toPascalCase(name)];
}

describe("category icons", () => {
  it("offers exactly the names the api accepts", () => {
    // Arrange
    const offered = Object.keys(categoryIcons).sort();

    // Act
    const accepted = [...CATEGORY_ICON_NAMES].sort();

    // Assert
    expect(offered).toEqual(accepted);
  });

  it.each(defaultNames)("default icon %s exists in the installed Lucide version", (name) => {
    // Arrange
    const exported = lucideExport(name);

    // Act
    const resolved = resolveCategoryIcon(name);

    // Assert
    expect(exported).toBeDefined();
    expect(resolved).toBe(exported);
  });

  it("maps every curated name to its Lucide icon", () => {
    // Arrange
    const names = Object.keys(categoryIcons);

    // Act
    const mismatches = names.filter((name) => categoryIcons[name] !== lucideExport(name));

    // Assert
    expect(mismatches).toEqual([]);
  });

  it("returns null for unknown, empty and inherited names", () => {
    // Arrange
    const names = ["not-an-icon", "", null, undefined, "constructor", "toString"];

    // Act
    const resolved = names.map((name) => resolveCategoryIcon(name));

    // Assert
    expect(resolved).toEqual([null, null, null, null, null, null]);
  });
});
