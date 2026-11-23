import type { CategoriesResponse } from "@miplata/shared";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../app/i18n";
import { makeAccount } from "../../test/fake-api";
import {
  activeChips,
  defaultFilters,
  emptyFilters,
  isInvertedRange,
  toQuery,
} from "./movement-filters";

const t = createI18n("es").t;

const catalog: CategoriesResponse = {
  expenseGroups: [
    {
      id: "housing",
      nameKey: null,
      name: "Hogar",
      sortOrder: 0,
      categories: [
        {
          id: "rent",
          type: "expense",
          groupId: "housing",
          nameKey: null,
          name: "Alquiler",
          icon: null,
          color: 1,
          isActive: true,
          sortOrder: 0,
        },
      ],
    },
  ],
  income: [],
};

const accounts = [
  makeAccount({ id: "galicia", name: "Galicia", type: "bank" }),
  makeAccount({ id: "juan", name: "Juan", type: "person" }),
];

describe("filters", () => {
  it("starts on the current month", () => {
    // Arrange
    const month = "2026-11";

    // Act
    const filters = defaultFilters(month);

    // Assert
    expect(filters).toMatchObject({ from: "2026-11-01", to: "2026-11-30", type: "" });
  });

  it("builds the query from the filters and the search text", () => {
    // Arrange
    const filters = {
      ...defaultFilters("2026-11"),
      type: "expense" as const,
      accountId: "galicia",
      personId: "juan",
      groupId: "housing",
      categoryId: "rent",
      currency: "USD" as const,
      min: "1.000",
      max: "5.000,50",
    };

    // Act
    const query = toQuery(filters, "  plumber ");

    // Assert
    expect(query).toEqual({
      q: "plumber",
      from: "2026-11-01",
      to: "2026-11-30",
      type: "expense",
      accountId: "galicia",
      personId: "juan",
      groupId: "housing",
      categoryId: "rent",
      currency: "USD",
      minAmountMinor: 100_000,
      maxAmountMinor: 500_050,
    });
  });

  it("reads the amount range in the selected currency and sends that currency", () => {
    // Arrange
    const filters = { ...emptyFilters(), currency: "USD" as const, min: "10,50", max: "20" };

    // Act
    const query = toQuery(filters, "");

    // Assert
    expect(query).toEqual({ currency: "USD", minAmountMinor: 1_050, maxAmountMinor: 2_000 });
  });

  it("pins an amount range without a currency to pesos", () => {
    // Arrange
    const filters = { ...emptyFilters(), min: "100" };

    // Act
    const query = toQuery(filters, "");

    // Assert
    expect(query).toEqual({ currency: "ARS", minAmountMinor: 10_000 });
  });

  it("sends nothing for empty filters and ignores unreadable amounts", () => {
    // Arrange
    const filters = { ...emptyFilters(), min: "abc", max: "" };

    // Act
    const query = toQuery(filters, "");

    // Assert
    expect(query).toEqual({});
  });
});

describe("active filter chips", () => {
  const context = { t, locale: "es-AR", accounts, catalog };

  it("names the month when the period is a whole month", () => {
    // Arrange
    const filters = defaultFilters("2026-11");

    // Act
    const chips = activeChips(filters, context);

    // Assert
    expect(chips).toEqual([{ key: "period", label: "Noviembre", clear: { from: "", to: "" } }]);
  });

  it("shows a custom period as a range", () => {
    // Arrange
    const filters = { ...emptyFilters(), from: "2026-11-03" };

    // Act
    const chips = activeChips(filters, context);

    // Assert
    expect(chips[0]?.label).toBe("2026-11-03 – …");
  });

  it("shows one chip per active filter that clears just that filter", () => {
    // Arrange
    const filters = {
      ...emptyFilters(),
      type: "income" as const,
      accountId: "galicia",
      personId: "juan",
      groupId: "housing",
      categoryId: "rent",
      currency: "ARS" as const,
      min: "10",
      max: "20",
    };

    // Act
    const chips = activeChips(filters, context);

    // Assert
    expect(chips.map((chip) => chip.label)).toEqual([
      "Ingreso",
      "Galicia",
      "Juan",
      "Hogar",
      "Alquiler",
      "ARS",
      "Desde ARS 10",
      "Hasta ARS 20",
    ]);
    expect(chips[1]?.clear).toEqual({ accountId: "" });
  });

  it("does not show a chip for an amount that is not applied and flags inverted ranges", () => {
    // Arrange
    const unreadable = { ...emptyFilters(), min: "abc" };
    const inverted = { ...emptyFilters(), min: "50", max: "10" };
    const dates = { ...emptyFilters(), from: "2026-12-01", to: "2026-11-01" };

    // Act
    const chips = activeChips(unreadable, context);

    // Assert
    expect(chips).toEqual([]);
    expect([
      isInvertedRange(inverted),
      isInvertedRange(dates),
      isInvertedRange(unreadable),
    ]).toEqual([true, true, false]);
  });

  it("falls back to the raw id when the catalog or account is unknown", () => {
    // Arrange
    const filters = { ...emptyFilters(), accountId: "x", groupId: "y", categoryId: "z" };

    // Act
    const chips = activeChips(filters, { t, locale: "es-AR", accounts: [], catalog: null });

    // Assert
    expect(chips.map((chip) => chip.label)).toEqual(["x", "y", "z"]);
  });
});
