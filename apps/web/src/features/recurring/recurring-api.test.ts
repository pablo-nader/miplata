import { afterEach, describe, expect, it, vi } from "vitest";
import { stubApi } from "../../test/fake-api";
import { makeMovement } from "../../test/fake-movements";
import { makeRecurring, occurrenceList, rent } from "../../test/fake-recurring";
import {
  confirmOccurrence,
  endRecurring,
  fetchOccurrences,
  fetchRecurring,
  fetchRecurringList,
  pauseRecurring,
  resumeRecurring,
  saveRecurring,
  skipOccurrence,
} from "./recurring-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

const request = {
  type: "expense",
  frequency: "monthly",
  dayOfMonth: 5,
  amountMode: "fixed",
  amountMinor: 100,
  currency: "ARS",
  accountId: "a",
  categoryId: "c",
  description: null,
  startsOn: "2026-11-25",
  endsOn: null,
} as const;

describe("reads", () => {
  it("lists definitions, loads one and filters occurrences by type", async () => {
    // Arrange
    const { calls } = stubApi({
      "GET /api/recurring": { body: { items: [makeRecurring()] } },
      "GET /api/recurring/rec-rent": { body: makeRecurring() },
      "GET /api/recurring/occurrences?type=expense": occurrenceList([rent]),
    });

    // Act
    const list = await fetchRecurringList();
    const one = await fetchRecurring("rec-rent");
    const occurrences = await fetchOccurrences("expense");

    // Assert
    expect(list.items).toHaveLength(1);
    expect(one.id).toBe("rec-rent");
    expect(occurrences.items).toHaveLength(1);
    expect(calls).toHaveLength(3);
  });

  it("rejects when the server answers with an error", async () => {
    // Arrange
    stubApi({});

    // Act
    const failed = fetchRecurringList();

    // Assert
    await expect(failed).rejects.toThrow("status 404");
  });
});

describe("mutations", () => {
  it("creates with POST and updates with PUT", async () => {
    // Arrange
    const { calls } = stubApi({
      "POST /api/recurring": { status: 201, body: makeRecurring() },
      "PUT /api/recurring/rec-rent": { body: makeRecurring() },
    });

    // Act
    const created = await saveRecurring(null, request);
    const updated = await saveRecurring("rec-rent", request);

    // Assert
    expect(created.ok).toBe(true);
    expect(updated.ok).toBe(true);
    expect(calls.map((call) => call.key)).toEqual([
      "POST /api/recurring",
      "PUT /api/recurring/rec-rent",
    ]);
    expect(calls[0]?.body).toEqual(request);
  });

  it("pauses, resumes and ends", async () => {
    // Arrange
    const { calls } = stubApi({
      "POST /api/recurring/rec-rent/pause": { body: makeRecurring({ isPaused: true }) },
      "POST /api/recurring/rec-rent/resume": { body: makeRecurring() },
      "POST /api/recurring/rec-rent/end": { body: makeRecurring({ endsOn: "2026-11-25" }) },
    });

    // Act
    const paused = await pauseRecurring("rec-rent");
    const resumed = await resumeRecurring("rec-rent");
    const ended = await endRecurring("rec-rent");

    // Assert
    expect(paused).toMatchObject({ ok: true, value: { isPaused: true } });
    expect(resumed.ok).toBe(true);
    expect(ended).toMatchObject({ ok: true, value: { endsOn: "2026-11-25" } });
    expect(calls).toHaveLength(3);
  });

  it("confirms with a body and skips without one", async () => {
    // Arrange
    const { calls } = stubApi({
      "POST /api/recurring/occurrences/occ-rent/confirm": { status: 201, body: makeMovement() },
      "POST /api/recurring/occurrences/occ-rent/skip": { status: 204 },
    });

    // Act
    const confirmed = await confirmOccurrence("occ-rent", { occurredOn: "2026-11-25" });
    const skipped = await skipOccurrence("occ-rent");

    // Assert
    expect(confirmed.ok).toBe(true);
    expect(skipped).toEqual({ ok: true, value: null });
    expect(calls[0]?.body).toEqual({ occurredOn: "2026-11-25" });
  });

  it("returns the reason or error code of a failed request", async () => {
    // Arrange
    stubApi({
      "POST /api/recurring": {
        status: 400,
        body: { error: "invalid_request", reason: "account_not_found" },
      },
      "POST /api/recurring/rec-rent/resume": { status: 409, body: { error: "recurring_ended" } },
    });

    // Act
    const reason = await saveRecurring(null, request);
    const code = await resumeRecurring("rec-rent");

    // Assert
    expect(reason).toEqual({ ok: false, error: "account_not_found" });
    expect(code).toEqual({ ok: false, error: "recurring_ended" });
  });

  it("reports a network failure", async () => {
    // Arrange
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );

    // Act
    const result = await skipOccurrence("occ-rent");

    // Assert
    expect(result).toEqual({ ok: false, error: "network" });
  });
});
