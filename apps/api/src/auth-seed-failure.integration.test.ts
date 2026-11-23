import { eq, user } from "@miplata/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuthHarness } from "./test/auth-harness";

type Harness = Awaited<ReturnType<typeof createAuthHarness>>;

let harness: Harness;
let failures = 1;

beforeAll(async () => {
  harness = await createAuthHarness(async () => {
    if (failures > 0) {
      failures -= 1;
      throw new Error("seed failed");
    }
  });
});

afterAll(async () => {
  await harness.close();
});

describe("first sign-in when seeding fails", () => {
  it("removes the new user so the next attempt starts from scratch", async () => {
    // Arrange
    const email = "retry@example.com";

    // Act
    const failed = harness.signUpWithGoogle(email);
    await expect(failed).rejects.toThrow();
    const afterFailure = await harness.db.select().from(user).where(eq(user.email, email));
    const retried = await harness.signUpWithGoogle(email);
    const afterRetry = await harness.db.select().from(user).where(eq(user.email, email));

    // Assert
    expect(afterFailure).toHaveLength(0);
    expect(afterRetry.map((row) => row.id)).toEqual([retried]);
  });
});
