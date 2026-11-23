import { describe, expect, it } from "vitest";
import { EnvError, parseEnv } from "./env";

const valid = {
  DATABASE_URL: "postgres://u:p@localhost:5432/db",
  BETTER_AUTH_SECRET: "a-secret-that-is-at-least-32-characters-long",
  BETTER_AUTH_URL: "http://localhost:5173",
  GOOGLE_CLIENT_ID: "client-id",
  GOOGLE_CLIENT_SECRET: "client-secret",
};

describe("parseEnv", () => {
  it("returns the typed configuration when everything is present", () => {
    // Arrange
    const source = { ...valid, EXTRA: "ignored" };

    // Act
    const env = parseEnv(source);

    // Assert
    expect(env).toEqual(valid);
  });

  it("names every missing variable and never prints values", () => {
    // Arrange
    const source = { ...valid, DATABASE_URL: undefined, GOOGLE_CLIENT_SECRET: "" };

    // Act
    const act = () => parseEnv(source);

    // Assert
    expect(act).toThrow(EnvError);
    expect(act).toThrow(/DATABASE_URL/);
    expect(act).toThrow(/GOOGLE_CLIENT_SECRET/);
    expect(act).not.toThrow(/BETTER_AUTH_SECRET/);
  });

  it("rejects a short secret without echoing it", () => {
    // Arrange
    const source = { ...valid, BETTER_AUTH_SECRET: "too-short-value" };

    // Act
    let message = "";
    try {
      parseEnv(source);
    } catch (error) {
      message = (error as Error).message;
    }

    // Assert
    expect(message).toMatch(/BETTER_AUTH_SECRET/);
    expect(message).not.toContain("too-short-value");
  });

  it("rejects a base url that is not a valid url", () => {
    // Arrange
    const source = { ...valid, BETTER_AUTH_URL: "not a url" };

    // Act
    const act = () => parseEnv(source);

    // Assert
    expect(act).toThrow(/BETTER_AUTH_URL/);
    expect(act).not.toThrow(/not a url/);
  });
});
