import { describe, expect, it } from "vitest";
import { featuredItems, filterSections, normalizeText } from "./category-search";

const sections = [
  {
    id: "home",
    title: "Hogar",
    items: [
      { id: "rent", name: "Alquiler" },
      { id: "gas", name: "Gas" },
    ],
  },
  {
    id: "health",
    title: "Salud",
    items: [
      { id: "pharmacy", name: "Farmacia" },
      { id: "doctor", name: "Médico" },
    ],
  },
  { id: "empty", title: "Vacío", items: [] },
  { id: "income", title: null, items: [{ id: "salary", name: "Sueldo" }] },
];

const names = (
  result: ReturnType<
    typeof filterSections<{ id: string; name: string }, (typeof sections)[number]>
  >,
) => result.map((section) => [section.id, section.items.map((item) => item.id)]);

describe("normalizeText", () => {
  it("drops accents, case and surrounding spaces", () => {
    // Arrange
    const raw = "  MÉDICO Ñandú ";

    // Act
    const result = normalizeText(raw);

    // Assert
    expect(result).toBe("medico nandu");
  });
});

describe("filterSections", () => {
  it("keeps every section with items when the query is empty", () => {
    // Arrange
    const query = "   ";

    // Act
    const result = filterSections(sections, query);

    // Assert
    expect(result.map((section) => section.id)).toEqual(["home", "health", "income"]);
  });

  it("matches without caring about accents or case", () => {
    // Arrange
    const typed = "MEDICO";

    // Act
    const result = filterSections(sections, typed);

    // Assert
    expect(names(result)).toEqual([["health", ["doctor"]]]);
  });

  it("matches accented text when the query has no accent and the other way around", () => {
    // Arrange
    const plain = filterSections(sections, "vacio");
    const accented = filterSections(sections, "médico");

    // Act
    const result = [plain.length, names(accented)];

    // Assert
    expect(result).toEqual([0, [["health", ["doctor"]]]]);
  });

  it("returns the whole group when the group name matches", () => {
    // Arrange
    const typed = "salu";

    // Act
    const result = filterSections(sections, typed);

    // Assert
    expect(names(result)).toEqual([["health", ["pharmacy", "doctor"]]]);
  });

  it("returns several groups in their original order when both match", () => {
    // Arrange
    const typed = "a";

    // Act
    const result = filterSections(sections, typed);

    // Assert
    expect(result.map((section) => section.id)).toEqual(["home", "health"]);
    expect(result[0]?.items.map((item) => item.id)).toEqual(["rent", "gas"]);
  });

  it("returns nothing when no category or group matches", () => {
    // Arrange
    const typed = "zzz";

    // Act
    const result = filterSections(sections, typed);

    // Assert
    expect(result).toEqual([]);
  });

  it("matches sections without a title by category name only", () => {
    // Arrange
    const typed = "sueldo";

    // Act
    const result = filterSections(sections, typed);

    // Assert
    expect(names(result)).toEqual([["income", ["salary"]]]);
  });

  it("uses the given locale for lower casing", () => {
    // Arrange
    const turkish = [{ id: "x", title: null, items: [{ id: "i", name: "IŞIK" }] }];

    // Act
    const result = filterSections(turkish, "ışık", "tr");

    // Assert
    expect(result).toHaveLength(1);
  });
});

describe("featuredItems", () => {
  const all = ["a", "b", "c", "d", "e", "f"].map((id) => ({ id }));
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  it("falls back to the default order without usage data", () => {
    // Arrange
    const preferred = undefined;

    // Act
    const result = featuredItems(all, null, preferred, 4);

    // Assert
    expect(ids(result)).toEqual(["a", "b", "c", "d"]);
  });

  it("puts the most used first and fills the rest with the default order", () => {
    // Arrange
    const preferred = ["e", "c"];

    // Act
    const result = featuredItems(all, null, preferred, 4);

    // Assert
    expect(ids(result)).toEqual(["e", "c", "a", "b"]);
  });

  it("ignores unknown and repeated ids", () => {
    // Arrange
    const preferred = ["zzz", "d", "d"];

    // Act
    const result = featuredItems(all, null, preferred, 4);

    // Assert
    expect(ids(result)).toEqual(["d", "a", "b", "c"]);
  });

  it("keeps the selected category visible by replacing the last one", () => {
    // Arrange
    const preferred = ["a", "b", "c", "d"];

    // Act
    const result = featuredItems(all, "f", preferred, 4);

    // Assert
    expect(ids(result)).toEqual(["a", "b", "c", "f"]);
  });

  it("returns fewer when fewer categories exist", () => {
    // Arrange
    const few = all.slice(0, 2);

    // Act
    const result = featuredItems(few, null, ["b"], 4);

    // Assert
    expect(ids(result)).toEqual(["b", "a"]);
  });
});
