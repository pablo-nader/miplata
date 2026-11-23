import type { CategoryDto } from "@miplata/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../app";
import type { CategoryRepository } from "../../categories/application/category-repository";
import { inMemoryAccounts, inMemoryInstitutions } from "../../test/account-fakes";
import { inMemoryMovements } from "../../test/movement-fakes";
import { inMemoryRecurring } from "../../test/recurring-fakes";
import { emptyReports } from "../../test/report-fakes";
import { inertStatements } from "../../test/statement-fakes";

const CATEGORY = "00000000-0000-4000-8000-000000000009";
const MISSING = "00000000-0000-4000-8000-000000000001";

const category: CategoryDto = {
  id: CATEGORY,
  type: "expense",
  groupId: null,
  nameKey: null,
  name: "Rent",
  icon: null,
  color: 1,
  isActive: true,
  sortOrder: 0,
};

type Json = ReturnType<typeof JSON.parse>;

function json(response: Response): Promise<Json> {
  return response.json();
}

let app: ReturnType<typeof createApp>;
let cashId: string;
let today = "2026-11-23";

function call(method: string, path: string, user: string | null, body?: unknown) {
  return app.request(`/api${path}`, {
    method,
    headers: {
      ...(user ? { "x-user": user } : {}),
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function rent(changes: Record<string, unknown> = {}) {
  return {
    type: "expense",
    frequency: "monthly",
    dayOfMonth: 5,
    amountMode: "fixed",
    amountMinor: 500_000_00,
    currency: "ARS",
    accountId: cashId,
    categoryId: CATEGORY,
    description: "Rent",
    startsOn: "2026-11-01",
    ...changes,
  };
}

async function created(changes: Record<string, unknown> = {}) {
  const response = await call("POST", "/recurring", "alice", rent(changes));
  return (await response.json()) as { id: string };
}

async function firstOccurrenceId() {
  const response = await call("GET", "/recurring/occurrences", "alice");
  const body = (await response.json()) as { items: { id: string }[] };
  return (body.items[0] as { id: string }).id;
}

beforeEach(async () => {
  today = "2026-11-23";
  const store = inMemoryAccounts();
  const cash = await store.repository.create("alice", {
    type: "cash",
    institutionId: null,
    name: "Cash",
    closingDay: null,
    dueDay: null,
    currencies: [{ currency: "ARS", openingBalanceMinor: 0 }],
  });
  cashId = cash.id;
  const recurring = inMemoryRecurring();
  app = createApp({
    readVersion: () => "test",
    authHandler: async () => new Response("auth"),
    resolveSession: async (headers) => headers.get("x-user") ?? null,
    users: { findById: async () => null, updateLocale: async () => null },
    accounts: {
      accounts: store.repository,
      everyAccount: store.repository,
      institutions: inMemoryInstitutions([]),
    },
    people: store.repository,
    categories: {
      findCategory: async (_userId: string, id: string) => (id === CATEGORY ? category : null),
    } as CategoryRepository,
    movements: inMemoryMovements(recurring.claim).repository,
    recurring: recurring.repository,
    reports: emptyReports(),
    statements: inertStatements,
    today: () => today,
  });
});

describe("recurring routes", () => {
  it("requires a session on every route", async () => {
    // Arrange
    const routes: [string, string][] = [
      ["GET", "/recurring"],
      ["POST", "/recurring"],
      ["GET", "/recurring/occurrences"],
      ["POST", `/recurring/occurrences/${MISSING}/confirm`],
      ["POST", `/recurring/occurrences/${MISSING}/skip`],
      ["GET", `/recurring/${MISSING}`],
      ["PUT", `/recurring/${MISSING}`],
      ["POST", `/recurring/${MISSING}/pause`],
      ["POST", `/recurring/${MISSING}/resume`],
      ["POST", `/recurring/${MISSING}/end`],
    ];

    // Act
    const responses = await Promise.all(routes.map(([method, path]) => call(method, path, null)));

    // Assert
    expect(responses.map((response) => response.status)).toEqual(routes.map(() => 401));
  });

  it("creates, reads, lists and edits a recurring movement", async () => {
    // Arrange
    const { id } = await created();

    // Act
    const read = await call("GET", `/recurring/${id}`, "alice");
    const listed = await call("GET", "/recurring", "alice");
    const edited = await call("PUT", `/recurring/${id}`, "alice", rent({ dayOfMonth: 10 }));

    // Assert
    expect(read.status).toBe(200);
    expect(await listed.json()).toMatchObject({ items: [{ id }] });
    expect(await edited.json()).toMatchObject({ id, dayOfMonth: 10 });
  });

  it("rejects an invalid body and a business violation", async () => {
    // Arrange
    const noAmount = rent({ amountMinor: null });
    const missingAccount = rent({ accountId: MISSING });

    // Act
    const invalid = await call("POST", "/recurring", "alice", noAmount);
    const violation = await call("POST", "/recurring", "alice", missingAccount);

    // Assert
    expect(invalid.status).toBe(400);
    expect(await violation.json()).toEqual({
      error: "invalid_request",
      reason: "account_not_found",
    });
  });

  it("answers 404 for unknown or malformed ids and for another user's data", async () => {
    // Arrange
    const { id } = await created();

    // Act
    const responses = await Promise.all([
      call("GET", "/recurring/not-a-uuid", "alice"),
      call("GET", `/recurring/${MISSING}`, "alice"),
      call("PUT", `/recurring/${id}`, "bob", rent()),
      call("PUT", "/recurring/not-a-uuid", "alice", rent()),
      call("POST", `/recurring/${id}/pause`, "bob"),
      call("POST", "/recurring/not-a-uuid/pause", "alice"),
      call("POST", `/recurring/${id}/resume`, "bob"),
      call("POST", "/recurring/not-a-uuid/resume", "alice"),
      call("POST", `/recurring/${id}/end`, "bob"),
      call("POST", "/recurring/not-a-uuid/end", "alice"),
      call("POST", `/recurring/occurrences/${MISSING}/confirm`, "alice", {}),
      call("POST", "/recurring/occurrences/not-a-uuid/confirm", "alice", {}),
      call("POST", `/recurring/occurrences/${MISSING}/skip`, "alice"),
      call("POST", "/recurring/occurrences/not-a-uuid/skip", "alice"),
    ]);

    // Assert
    expect(responses.map((response) => response.status)).toEqual(responses.map(() => 404));
  });

  it("generates occurrences when read and does not duplicate them", async () => {
    // Arrange
    await created();

    // Act
    const first = await call("GET", "/recurring/occurrences", "alice");
    const second = await call("GET", "/recurring/occurrences?type=expense", "alice");
    const income = await call("GET", "/recurring/occurrences?type=income", "alice");

    // Assert
    const dueDates = (await json(first)).items.map((item: { dueOn: string }) => item.dueOn);
    expect(dueDates).toEqual(["2026-11-05", "2026-12-05"]);
    expect((await json(second)).items).toHaveLength(2);
    expect((await json(income)).items).toHaveLength(0);
  });

  it("rejects an invalid occurrence filter", async () => {
    // Arrange
    const path = "/recurring/occurrences?type=transfer";

    // Act
    const response = await call("GET", path, "alice");

    // Assert
    expect(response.status).toBe(400);
  });

  it("confirms an occurrence once and then reports it as resolved", async () => {
    // Arrange
    await created();
    const occurrenceId = await firstOccurrenceId();

    // Act
    const confirmed = await call(
      "POST",
      `/recurring/occurrences/${occurrenceId}/confirm`,
      "alice",
      {
        amountMinor: 450_000_00,
      },
    );
    const again = await call("POST", `/recurring/occurrences/${occurrenceId}/confirm`, "alice", {});
    const skipped = await call("POST", `/recurring/occurrences/${occurrenceId}/skip`, "alice");

    // Assert
    expect(confirmed.status).toBe(201);
    expect(again.status).toBe(409);
    expect(skipped.status).toBe(409);
  });

  it("requires an amount to confirm a variable occurrence", async () => {
    // Arrange
    await created({ amountMode: "variable", amountMinor: null });
    const occurrenceId = await firstOccurrenceId();

    // Act
    const response = await call("POST", `/recurring/occurrences/${occurrenceId}/confirm`, "alice");

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "amount_required" });
  });

  it("rejects a confirmation body that is not valid", async () => {
    // Arrange
    await created();
    const occurrenceId = await firstOccurrenceId();

    // Act
    const response = await call("POST", `/recurring/occurrences/${occurrenceId}/confirm`, "alice", {
      amountMinor: -5,
    });

    // Assert
    expect(response.status).toBe(400);
  });

  it("skips an occurrence", async () => {
    // Arrange
    await created();
    const occurrenceId = await firstOccurrenceId();

    // Act
    const skipped = await call("POST", `/recurring/occurrences/${occurrenceId}/skip`, "alice");
    const listed = await call("GET", "/recurring/occurrences", "alice");

    // Assert
    expect(skipped.status).toBe(204);
    expect((await json(listed)).items).toHaveLength(1);
  });

  it("pauses, resumes and ends a recurring movement", async () => {
    // Arrange
    const { id } = await created();

    // Act
    const paused = await call("POST", `/recurring/${id}/pause`, "alice");
    const resumed = await call("POST", `/recurring/${id}/resume`, "alice");
    const ended = await call("POST", `/recurring/${id}/end`, "alice", { endsOn: "2026-12-31" });
    const resumedBeforeEndDate = await call("POST", `/recurring/${id}/resume`, "alice");

    // Assert
    expect(await paused.json()).toMatchObject({ isPaused: true });
    expect(await resumed.json()).toMatchObject({ isPaused: false });
    expect(await ended.json()).toMatchObject({ endsOn: "2026-12-31" });
    expect(resumedBeforeEndDate.status).toBe(200);
  });

  it("refuses to resume a recurring movement that already ended", async () => {
    // Arrange
    const { id } = await created();
    await call("POST", `/recurring/${id}/end`, "alice", { endsOn: "2026-11-10" });

    // Act
    const response = await call("POST", `/recurring/${id}/resume`, "alice");

    // Assert
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "recurring_ended" });
  });

  it("rejects an end date before the start date", async () => {
    // Arrange
    const { id } = await created();

    // Act
    const response = await call("POST", `/recurring/${id}/end`, "alice", { endsOn: "2026-10-01" });
    const invalid = await call("POST", `/recurring/${id}/end`, "alice", { endsOn: "nope" });

    // Assert
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_range" });
    expect(invalid.status).toBe(400);
  });

  it("ends with today as the default date", async () => {
    // Arrange
    const { id } = await created();

    // Act
    const response = await call("POST", `/recurring/${id}/end`, "alice");

    // Assert
    expect(await response.json()).toMatchObject({ endsOn: today });
  });

  it("keeps generated history unchanged when the schedule is edited", async () => {
    // Arrange
    const { id } = await created();
    await call("GET", "/recurring/occurrences", "alice");

    // Act
    await call("PUT", `/recurring/${id}`, "alice", rent({ dayOfMonth: 10 }));
    const listed = await call("GET", "/recurring/occurrences", "alice");

    // Assert
    const dueDates = (await json(listed)).items.map((item: { dueOn: string }) => item.dueOn);
    expect(dueDates).toEqual(["2026-11-05", "2026-12-10"]);
  });

  it("does not backfill the paused period after resuming", async () => {
    // Arrange
    const { id } = await created({ startsOn: "2026-09-01" });
    await call("POST", `/recurring/${id}/pause`, "alice");
    today = "2027-01-10";

    // Act
    await call("POST", `/recurring/${id}/resume`, "alice");
    const listed = await call("GET", "/recurring/occurrences", "alice");

    // Assert
    const dueDates = (await json(listed)).items.map((item: { dueOn: string }) => item.dueOn);
    expect(dueDates).toEqual(["2026-09-05", "2026-10-05", "2026-11-05", "2027-02-05"]);
  });

  it("leaves an active recurring movement and its dates alone when resumed", async () => {
    // Arrange
    const { id } = await created();

    // Act
    const resumed = await call("POST", `/recurring/${id}/resume`, "alice");
    const listed = await call("GET", "/recurring/occurrences", "alice");

    // Assert
    expect(await json(resumed)).toMatchObject({ id, isPaused: false });
    expect((await json(listed)).items).toHaveLength(2);
  });
});
