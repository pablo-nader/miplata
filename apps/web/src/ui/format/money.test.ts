import { describe, expect, it } from "vitest";
import { formatMoney, localeForLanguage, MINUS, SPACE } from "./money";

describe("formatMoney", () => {
  it("formats pesos in es-AR with dot grouping", () => {
    // Arrange
    const amount = 1250000;

    // Act
    const text = formatMoney(amount, "ARS", "es-AR");

    // Assert
    expect(text).toBe(`$${SPACE}1.250.000`);
  });

  it("groups four-digit numbers in es-AR", () => {
    // Arrange
    const amount = 1230;

    // Act
    const text = formatMoney(amount, "ARS", "es-AR");

    // Assert
    expect(text).toBe(`$${SPACE}1.230`);
  });

  it("formats pesos in en-US with comma grouping", () => {
    // Arrange
    const amount = 1250000;

    // Act
    const text = formatMoney(amount, "ARS", "en-US");

    // Assert
    expect(text).toBe(`$${SPACE}1,250,000`);
  });

  it("prefixes dollars with US$", () => {
    // Arrange
    const amount = 1000;

    // Act
    const text = formatMoney(amount, "USD", "es-AR");

    // Assert
    expect(text).toBe(`US$${SPACE}1.000`);
  });

  it("uses the Unicode minus for expenses", () => {
    // Arrange
    const amount = 48300;

    // Act
    const text = formatMoney(amount, "ARS", "es-AR", "expense");

    // Assert
    expect(text).toBe(`${MINUS}${SPACE}$${SPACE}48.300`);
    expect(text.startsWith("−")).toBe(true);
  });

  it("uses a plus sign for income", () => {
    // Arrange
    const amount = 1250000;

    // Act
    const text = formatMoney(amount, "ARS", "es-AR", "income");

    // Assert
    expect(text).toBe(`+${SPACE}$${SPACE}1.250.000`);
  });

  it("shows a minus for negative neutral amounts", () => {
    // Arrange
    const amount = -1104900;

    // Act
    const text = formatMoney(amount, "ARS", "es-AR");

    // Assert
    expect(text).toBe(`${MINUS}${SPACE}$${SPACE}1.104.900`);
  });

  it("shows two decimals only when the amount has cents", () => {
    // Arrange
    const amount = 1234.5;

    // Act
    const text = formatMoney(amount, "ARS", "es-AR");

    // Assert
    expect(text).toBe(`$${SPACE}1.234,50`);
  });

  it("shows zero without a sign", () => {
    // Arrange
    const amount = 0;

    // Act
    const text = formatMoney(amount, "ARS", "es-AR", "expense");

    // Assert
    expect(text).toBe(`$${SPACE}0`);
  });
});

describe("localeForLanguage", () => {
  it("maps languages to locales and defaults to es-AR", () => {
    // Arrange
    const languages = ["es", "en", "EN-gb", "fr"];

    // Act
    const locales = languages.map(localeForLanguage);

    // Assert
    expect(locales).toEqual(["es-AR", "en-US", "en-US", "es-AR"]);
  });
});
