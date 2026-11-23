import { describe, expect, it } from "vitest";
import { cardRecognitionMonth, nonCardRecognitionMonth } from "./recognition-month";

describe("nonCardRecognitionMonth", () => {
  it("is the month of the movement date", () => {
    // Arrange
    const date = "2026-11-30";

    // Act
    const result = nonCardRecognitionMonth(date);

    // Assert
    expect(result).toBe("2026-11");
  });

  it("does not move a date at the start of a month", () => {
    // Arrange
    const date = "2027-01-01";

    // Act
    const result = nonCardRecognitionMonth(date);

    // Assert
    expect(result).toBe("2027-01");
  });
});

describe("cardRecognitionMonth", () => {
  it("is the month of the statement closing date", () => {
    // Arrange
    const closingDate = "2026-12-05";

    // Act
    const result = cardRecognitionMonth(closingDate);

    // Assert
    expect(result).toBe("2026-12");
  });

  it("differs from the purchase month when the statement closes later", () => {
    // Arrange
    const purchase = "2026-11-28";
    const closingDate = "2026-12-05";

    // Act
    const results = [nonCardRecognitionMonth(purchase), cardRecognitionMonth(closingDate)];

    // Assert
    expect(results).toEqual(["2026-11", "2026-12"]);
  });
});
