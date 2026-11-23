import { describe, expect, it } from "vitest";
import { fetchHealth } from "./health-client";

function respond(body: unknown, status = 200): typeof fetch {
  return async () => new Response(JSON.stringify(body), { status });
}

describe("fetchHealth", () => {
  it("returns the parsed health response", async () => {
    // Arrange
    const request = respond({ status: "ok", version: "1.0.0" });

    // Act
    const health = await fetchHealth(request);

    // Assert
    expect(health).toEqual({ status: "ok", version: "1.0.0" });
  });

  it("fails when the server answers with an error status", async () => {
    // Arrange
    const request = respond({}, 500);

    // Act
    const result = fetchHealth(request);

    // Assert
    await expect(result).rejects.toThrow("500");
  });

  it("fails when the payload does not match the contract", async () => {
    // Arrange
    const request = respond({ status: "down" });

    // Act
    const result = fetchHealth(request);

    // Assert
    await expect(result).rejects.toThrow();
  });
});
