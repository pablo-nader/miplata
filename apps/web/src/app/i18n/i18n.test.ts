import { CATEGORY_ICON_NAMES } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPENSE_GROUPS,
  DEFAULT_INCOME_CATEGORIES,
} from "../../../../../packages/db/src/seed/defaults";
import { createI18n, detectLanguage, resources, syncDocumentLanguage } from "./index";

function flatten(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation files", () => {
  it("have exactly the same keys in es and en", () => {
    // Arrange
    const es = flatten(resources.es.translation).sort();
    const en = flatten(resources.en.translation).sort();

    // Act
    const missingInEn = es.filter((key) => !en.includes(key));
    const missingInEs = en.filter((key) => !es.includes(key));

    // Assert
    expect(missingInEn).toEqual([]);
    expect(missingInEs).toEqual([]);
  });

  it("have a non-empty value for every key", () => {
    // Arrange
    const values = [resources.es, resources.en].flatMap(({ translation }) =>
      JSON.stringify(translation).match(/:\s*""/g),
    );

    // Act
    const empty = values.filter(Boolean);

    // Assert
    expect(empty).toEqual([]);
  });
});

describe("seeded defaults", () => {
  const keys = [
    ...DEFAULT_EXPENSE_GROUPS.flatMap((group) => [
      group.nameKey,
      ...group.categories.map((item) => item.nameKey),
    ]),
    ...DEFAULT_INCOME_CATEGORIES.map((item) => item.nameKey),
  ];

  it.each(["es", "en"] as const)("have a translation in %s for every seeded name", (language) => {
    // Arrange
    const instance = createI18n(language);

    // Act
    const missing = keys.filter((key) => !instance.exists(key));

    // Assert
    expect(missing).toEqual([]);
  });

  it.each(["es", "en"] as const)("name every curated icon in %s", (language) => {
    // Arrange
    const instance = createI18n(language);

    // Act
    const missing = CATEGORY_ICON_NAMES.filter(
      (name) => !instance.exists(`categories.icons.${name}`),
    );

    // Assert
    expect(missing).toEqual([]);
  });
});

describe("detectLanguage", () => {
  it("picks the first supported language", () => {
    // Arrange
    const preferred = ["fr-FR", "en-US", "es-AR"];

    // Act
    const language = detectLanguage(preferred);

    // Assert
    expect(language).toBe("en");
  });

  it("defaults to Spanish when nothing matches", () => {
    // Arrange
    const preferred = ["fr-FR", "de"];

    // Act
    const language = detectLanguage(preferred);

    // Assert
    expect(language).toBe("es");
  });
});

describe("createI18n", () => {
  it("translates keys in the selected language", () => {
    // Arrange
    const english = createI18n("en");
    const spanish = createI18n("es");

    // Act
    const texts = [english.t("nav.home"), spanish.t("nav.home")];

    // Assert
    expect(texts).toEqual(["Home", "Inicio"]);
  });
});

describe("syncDocumentLanguage", () => {
  it("sets the lang attribute of the document", () => {
    // Arrange
    const target = document.implementation.createHTMLDocument("t");

    // Act
    syncDocumentLanguage("en", target);

    // Assert
    expect(target.documentElement.lang).toBe("en");
  });
});
