import { describe, expect, it } from "vitest";
import {
  assignInstallmentStatements,
  statementForPeriod,
  statementForPurchase,
  statementTotal,
} from "./statement-assignment";

const schedule = { closingDay: 20, dueDay: 5 };

describe("statementForPeriod", () => {
  it("builds the statement from the usual days", () => {
    // Arrange
    const period = "2026-11";

    // Act
    const result = statementForPeriod(schedule, period);

    // Assert
    expect(result).toEqual({
      periodMonth: "2026-11",
      closingDate: "2026-11-20",
      dueDate: "2026-12-05",
    });
  });

  it("puts the due date in the same month when the due day is after the closing day", () => {
    // Arrange
    const card = { closingDay: 5, dueDay: 20 };

    // Act
    const result = statementForPeriod(card, "2026-11");

    // Assert
    expect(result.dueDate).toBe("2026-11-20");
  });

  it("moves the due date to the next month when both days are equal", () => {
    // Arrange
    const card = { closingDay: 10, dueDay: 10 };

    // Act
    const result = statementForPeriod(card, "2026-11");

    // Assert
    expect(result.dueDate).toBe("2026-12-10");
  });

  it("rolls the due date into the next year", () => {
    // Arrange
    const period = "2026-12";

    // Act
    const result = statementForPeriod(schedule, period);

    // Assert
    expect(result.dueDate).toBe("2027-01-05");
  });

  it("clamps a closing day of 31 in short months", () => {
    // Arrange
    const card = { closingDay: 31, dueDay: 10 };

    // Act
    const results = ["2026-02", "2026-04", "2028-02", "2026-01"].map(
      (m) => statementForPeriod(card, m).closingDate,
    );

    // Assert
    expect(results).toEqual(["2026-02-28", "2026-04-30", "2028-02-29", "2026-01-31"]);
  });

  it("clamps a due day of 31 in the due month", () => {
    // Arrange
    const card = { closingDay: 10, dueDay: 31 };

    // Act
    const result = statementForPeriod(card, "2026-02");

    // Assert
    expect(result.dueDate).toBe("2026-02-28");
  });

  it("moves the due date to the next month when clamping would make it equal the closing date", () => {
    // Arrange
    const card = { closingDay: 28, dueDay: 31 };

    // Act
    const result = statementForPeriod(card, "2026-02");

    // Assert
    expect(result).toEqual({
      periodMonth: "2026-02",
      closingDate: "2026-02-28",
      dueDate: "2026-03-31",
    });
  });

  it("uses the override of a single statement", () => {
    // Arrange
    const overrides = { "2026-11": { closingDate: "2026-11-25", dueDate: "2026-12-10" } };

    // Act
    const overridden = statementForPeriod(schedule, "2026-11", overrides);
    const untouched = statementForPeriod(schedule, "2026-12", overrides);

    // Assert
    expect(overridden).toEqual({
      periodMonth: "2026-11",
      closingDate: "2026-11-25",
      dueDate: "2026-12-10",
    });
    expect(untouched.closingDate).toBe("2026-12-20");
  });

  it("rejects an override whose closing date is outside the statement month", () => {
    // Arrange
    const overrides = { "2026-11": { closingDate: "2026-12-02", dueDate: "2026-12-10" } };

    // Act
    const act = () => statementForPeriod(schedule, "2026-11", overrides);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects an override whose due date is not after the closing date", () => {
    // Arrange
    const overrides = { "2026-11": { closingDate: "2026-11-25", dueDate: "2026-11-25" } };

    // Act
    const act = () => statementForPeriod(schedule, "2026-11", overrides);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it.each([
    { closingDay: 0, dueDay: 5 },
    { closingDay: 32, dueDay: 5 },
    { closingDay: 10, dueDay: 0 },
    { closingDay: 10, dueDay: 32 },
    { closingDay: 1.5, dueDay: 5 },
  ])("rejects the invalid schedule %j", (card) => {
    // Arrange
    const input = card;

    // Act
    const act = () => statementForPeriod(input, "2026-11");

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("statementForPurchase", () => {
  it("assigns a purchase before the closing date to the current statement", () => {
    // Arrange
    const date = "2026-11-10";

    // Act
    const result = statementForPurchase(date, schedule);

    // Assert
    expect(result.periodMonth).toBe("2026-11");
  });

  it("assigns a purchase on the closing date to that statement", () => {
    // Arrange
    const date = "2026-11-20";

    // Act
    const result = statementForPurchase(date, schedule);

    // Assert
    expect(result.periodMonth).toBe("2026-11");
  });

  it("assigns a purchase after the closing date to the next statement", () => {
    // Arrange
    const date = "2026-11-21";

    // Act
    const result = statementForPurchase(date, schedule);

    // Assert
    expect(result.periodMonth).toBe("2026-12");
  });

  it("rolls a late december purchase into january of the next year", () => {
    // Arrange
    const date = "2026-12-31";

    // Act
    const result = statementForPurchase(date, schedule);

    // Assert
    expect(result).toEqual({
      periodMonth: "2027-01",
      closingDate: "2027-01-20",
      dueDate: "2027-02-05",
    });
  });

  it("handles a closing day of 31 on the last day of february", () => {
    // Arrange
    const card = { closingDay: 31, dueDay: 10 };

    // Act
    const onClosing = statementForPurchase("2026-02-28", card);
    const after = statementForPurchase("2026-03-01", card);

    // Assert
    expect(onClosing.periodMonth).toBe("2026-02");
    expect(after.periodMonth).toBe("2026-03");
  });

  it("respects a corrected closing date that moves later", () => {
    // Arrange
    const overrides = { "2026-11": { closingDate: "2026-11-25", dueDate: "2026-12-10" } };

    // Act
    const withOverride = statementForPurchase("2026-11-23", schedule, overrides);
    const without = statementForPurchase("2026-11-23", schedule);

    // Assert
    expect(withOverride.periodMonth).toBe("2026-11");
    expect(without.periodMonth).toBe("2026-12");
  });

  it("respects a corrected closing date that moves earlier", () => {
    // Arrange
    const overrides = { "2026-11": { closingDate: "2026-11-15", dueDate: "2026-12-01" } };

    // Act
    const result = statementForPurchase("2026-11-18", schedule, overrides);

    // Assert
    expect(result.periodMonth).toBe("2026-12");
  });
});

describe("assignInstallmentStatements", () => {
  it("assigns each following installment to the next statement", () => {
    // Arrange
    const date = "2026-11-28";

    // Act
    const result = assignInstallmentStatements(date, 3, schedule);

    // Assert
    expect(result.map((s) => s.periodMonth)).toEqual(["2026-12", "2027-01", "2027-02"]);
  });

  it("starts at the current statement when the purchase is before the closing date", () => {
    // Arrange
    const date = "2026-11-02";

    // Act
    const result = assignInstallmentStatements(date, 2, schedule);

    // Assert
    expect(result.map((s) => s.closingDate)).toEqual(["2026-11-20", "2026-12-20"]);
  });

  it("uses an override only for its own statement", () => {
    // Arrange
    const overrides = { "2027-01": { closingDate: "2027-01-22", dueDate: "2027-02-08" } };

    // Act
    const result = assignInstallmentStatements("2026-11-28", 3, schedule, overrides);

    // Assert
    expect(result.map((s) => s.closingDate)).toEqual(["2026-12-20", "2027-01-22", "2027-02-20"]);
  });

  it("returns one statement for a single payment", () => {
    // Arrange
    const date = "2026-11-28";

    // Act
    const result = assignInstallmentStatements(date, 1, schedule);

    // Assert
    expect(result).toHaveLength(1);
  });

  it.each([0, -1, 1.5])("rejects the installment count %s", (count) => {
    // Arrange
    const date = "2026-11-28";

    // Act
    const act = () => assignInstallmentStatements(date, count, schedule);

    // Assert
    expect(act).toThrow(RangeError);
  });
});

describe("statementTotal", () => {
  it("adds previous balance, installments and charges and subtracts payments", () => {
    // Arrange
    const parts = {
      previousBalanceMinor: 50000,
      installmentsMinor: [30000, 20000],
      chargesMinor: [1500, 500],
      paymentsMinor: [40000],
    };

    // Act
    const result = statementTotal(parts);

    // Assert
    expect(result).toBe(62000);
  });

  it("is zero for an empty statement", () => {
    // Arrange
    const parts = {
      previousBalanceMinor: 0,
      installmentsMinor: [],
      chargesMinor: [],
      paymentsMinor: [],
    };

    // Act
    const result = statementTotal(parts);

    // Assert
    expect(result).toBe(0);
  });

  it("can be negative when payments exceed what is owed", () => {
    // Arrange
    const parts = {
      previousBalanceMinor: 0,
      installmentsMinor: [10000],
      chargesMinor: [],
      paymentsMinor: [15000],
    };

    // Act
    const result = statementTotal(parts);

    // Assert
    expect(result).toBe(-5000);
  });

  it("rejects a total outside the safe integer range", () => {
    // Arrange
    const parts = {
      previousBalanceMinor: Number.MAX_SAFE_INTEGER,
      installmentsMinor: [1],
      chargesMinor: [],
      paymentsMinor: [],
    };

    // Act
    const act = () => statementTotal(parts);

    // Assert
    expect(act).toThrow(RangeError);
  });

  it("rejects non-integer amounts", () => {
    // Arrange
    const parts = {
      previousBalanceMinor: 0.5,
      installmentsMinor: [],
      chargesMinor: [],
      paymentsMinor: [],
    };

    // Act
    const act = () => statementTotal(parts);

    // Assert
    expect(act).toThrow(RangeError);
  });
});
