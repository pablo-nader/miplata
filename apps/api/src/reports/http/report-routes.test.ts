import { describe, expect, it } from "vitest";
import { createApp } from "../../app";
import { unusedAccountDependencies } from "../../test/account-fakes";
import { recordingReports } from "../../test/report-fakes";
import type { TotalRow } from "../domain/report-aggregation";

const unusedCategories = {} as never;

function build(rows: TotalRow[] = []) {
  const { repository, calls } = recordingReports(rows);
  const app = createApp({
    readVersion: () => "t",
    authHandler: async () => new Response("auth"),
    resolveSession: async (headers) => headers.get("x-user") ?? null,
    users: { findById: async () => null, updateLocale: async () => null },
    categories: unusedCategories,
    ...unusedAccountDependencies(),
    reports: repository,
  });
  return { app, calls };
}

const get = (app: ReturnType<typeof build>["app"], path: string, user: string | null = "u1") =>
  app.request(`/api/reports${path}`, { headers: user ? { "x-user": user } : {} });

const id = "00000000-0000-4000-8000-000000000001";

describe("report routes", () => {
  it.each([
    "/spending?month=2026-11",
    `/spending/movements?month=2026-11&categoryId=${id}`,
    "/monthly?to=2026-11",
    "/changes?month=2026-11",
    "/committed?from=2026-12",
  ])("GET %s rejects requests without a session", async (path) => {
    // Arrange
    const { app } = build();

    // Act
    const response = await get(app, path, null);

    // Assert
    expect(response.status).toBe(401);
  });

  it.each([
    "/spending",
    "/spending?month=2026-13",
    "/spending/movements?month=2026-11",
    "/monthly?to=nope",
    "/changes?month=2026-11&currency=EUR",
    "/committed?from=2026-12&months=13",
  ])("GET %s rejects invalid queries", async (path) => {
    // Arrange
    const { app } = build();

    // Act
    const response = await get(app, path);

    // Assert
    expect(response.status).toBe(400);
  });

  it("queries the repository with the session user only and defaults to pesos", async () => {
    // Arrange
    const { app, calls } = build();

    // Act
    const response = await get(app, "/spending?month=2026-11");

    // Assert
    expect(response.status).toBe(200);
    expect(calls).toEqual([
      {
        userId: "u1",
        filter: {
          from: "2026-11",
          to: "2026-11",
          currency: "ARS",
          accountId: undefined,
          categoryId: undefined,
        },
      },
    ]);
  });

  it("reports committed months from installments", async () => {
    // Arrange
    const rows: TotalRow[] = [
      { month: "2026-12", type: "expense", categoryId: "c", groupId: "g", totalMinor: 500 },
    ];
    const { app } = build(rows);

    // Act
    const response = await get(app, "/committed?from=2026-12&months=2");
    const body = (await response.json()) as { months: unknown };

    // Assert
    expect(body.months).toEqual([
      { month: "2026-12", installmentsMinor: 500, recurringMinor: 0, totalMinor: 500 },
      { month: "2027-01", installmentsMinor: 0, recurringMinor: 0, totalMinor: 0 },
    ]);
  });
});
