import { describe, expect, it } from "vitest";
import {
  electricity,
  internet,
  makeOccurrence,
  makeRecurring,
  rent,
  salary,
  TODAY,
} from "../../test/fake-recurring";
import {
  confirmDate,
  dueKind,
  failureKey,
  pendingExpenses,
  sectionsOf,
  shortDate,
  statusOf,
} from "./recurring-display";

describe("dueKind", () => {
  it.each([
    ["2026-11-24", "overdue"],
    [TODAY, "today"],
    ["2026-11-26", "upcoming"],
  ] as const)("classifies %s as %s", (dueOn, expected) => {
    // Arrange
    const today = TODAY;

    // Act
    const kind = dueKind(dueOn, today);

    // Assert
    expect(kind).toBe(expected);
  });
});

describe("shortDate", () => {
  it("formats day and month in the locale's order", () => {
    // Arrange
    const date = "2026-11-20";

    // Act
    const texts = [shortDate(date, "es-AR"), shortDate(date, "en-US")];

    // Assert
    expect(texts).toEqual(["20/11", "11/20"]);
  });
});

describe("sectionsOf", () => {
  it("splits expenses into due and upcoming and keeps income apart, sorted by date", () => {
    // Arrange
    const items = [internet, salary, rent, electricity];

    // Act
    const sections = sectionsOf(items, TODAY);

    // Assert
    expect(sections.due.map((item) => item.id)).toEqual(["occ-power", "occ-rent"]);
    expect(sections.upcoming.map((item) => item.id)).toEqual(["occ-internet"]);
    expect(sections.receivable.map((item) => item.id)).toEqual(["occ-salary"]);
  });

  it("does not treat overdue income as an expense to pay", () => {
    // Arrange
    const overdueIncome = makeOccurrence({ id: "occ-late", type: "income", dueOn: "2026-11-01" });

    // Act
    const due = pendingExpenses([overdueIncome, rent], TODAY);

    // Assert
    expect(due.map((item) => item.id)).toEqual(["occ-rent"]);
  });
});

describe("confirmDate", () => {
  it("uses the due date when overdue and today otherwise", () => {
    // Arrange
    const overdue = { dueOn: "2026-11-20" };
    const upcoming = { dueOn: "2026-12-10" };

    // Act
    const dates = [
      confirmDate(overdue, TODAY),
      confirmDate({ dueOn: TODAY }, TODAY),
      confirmDate(upcoming, TODAY),
    ];

    // Assert
    expect(dates).toEqual(["2026-11-20", TODAY, TODAY]);
  });
});

describe("statusOf", () => {
  it("reports ended, paused and active definitions", () => {
    // Arrange
    const ended = makeRecurring({ endsOn: "2026-10-31" });
    const paused = makeRecurring({ isPaused: true });
    const endingLater = makeRecurring({ endsOn: "2026-12-31" });

    // Act
    const statuses = [
      statusOf(ended, TODAY),
      statusOf(paused, TODAY),
      statusOf(endingLater, TODAY),
      statusOf(makeRecurring({ endsOn: TODAY }), TODAY),
      statusOf(makeRecurring({ endsOn: "2026-12-01" }), TODAY),
    ];

    // Assert
    expect(statuses).toEqual(["ended", "paused", "active", "ended", "active"]);
  });

  it("keeps a paused definition that already ended as ended", () => {
    // Arrange
    const recurring = makeRecurring({ isPaused: true, endsOn: "2026-01-01" });

    // Act
    const status = statusOf(recurring, TODAY);

    // Assert
    expect(status).toBe("ended");
  });
});

describe("failureKey", () => {
  it("keeps known errors and falls back otherwise", () => {
    // Arrange
    const known = new Set(["network"]);

    // Act
    const keys = [failureKey("network", known, "failed"), failureKey("boom", known, "failed")];

    // Assert
    expect(keys).toEqual(["network", "failed"]);
  });
});
