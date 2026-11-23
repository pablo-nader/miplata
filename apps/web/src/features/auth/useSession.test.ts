import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "./useSession";

let result: { data: unknown; isPending: boolean; refetch: () => Promise<void> };

vi.mock("./auth-client", () => ({ authClient: { useSession: () => result } }));

const refetch = vi.fn(async () => {});

describe("useSession", () => {
  beforeEach(() => {
    refetch.mockClear();
  });

  it("reports loading while the session is pending", () => {
    // Arrange
    result = { data: null, isPending: true, refetch };

    // Act
    const { result: hook } = renderHook(() => useSession());

    // Assert
    expect(hook.current.status).toBe("loading");
  });

  it("reports signed out without a session", () => {
    // Arrange
    result = { data: null, isPending: false, refetch };

    // Act
    const { result: hook } = renderHook(() => useSession());

    // Assert
    expect(hook.current.status).toBe("signedOut");
    expect(hook.current.user).toBeNull();
  });

  it("maps the session user and falls back to Spanish for an unknown locale", () => {
    // Arrange
    result = {
      data: { user: { id: "1", name: "Ana", email: "a@b.c", image: undefined, locale: "xx" } },
      isPending: false,
      refetch,
    };

    // Act
    const { result: hook } = renderHook(() => useSession());

    // Assert
    expect(hook.current.user).toEqual({
      id: "1",
      name: "Ana",
      email: "a@b.c",
      image: null,
      locale: "es",
    });
  });

  it("refreshes through the client", async () => {
    // Arrange
    result = { data: null, isPending: false, refetch };
    const { result: hook } = renderHook(() => useSession());

    // Act
    await hook.current.refresh();

    // Assert
    expect(refetch).toHaveBeenCalledOnce();
  });
});
