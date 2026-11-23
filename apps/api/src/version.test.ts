import { afterEach, describe, expect, it, vi } from "vitest";
import { readVersion } from "./version";

afterEach(() => vi.unstubAllEnvs());

describe("readVersion", () => {
  it("uses the short commit sha on Vercel", () => {
    // Arrange
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "abcdef1234567");

    // Act
    const version = readVersion();

    // Assert
    expect(version).toBe("abcdef1");
  });

  it("falls back to the package version", () => {
    // Arrange
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");

    // Act
    const version = readVersion();

    // Assert
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
