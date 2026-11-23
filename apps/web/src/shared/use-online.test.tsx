import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOnline } from "./use-online";

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
}

describe("useOnline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts from the browser connection state", () => {
    // Arrange
    setOnline(false);

    // Act
    const { result } = renderHook(() => useOnline());

    // Assert
    expect(result.current).toBe(false);
  });

  it("becomes offline when the browser goes offline", () => {
    // Arrange
    setOnline(true);
    const { result } = renderHook(() => useOnline());

    // Act
    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event("offline"));
    });

    // Assert
    expect(result.current).toBe(false);
  });

  it("becomes online again when the connection returns", () => {
    // Arrange
    setOnline(false);
    const { result } = renderHook(() => useOnline());

    // Act
    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event("online"));
    });

    // Assert
    expect(result.current).toBe(true);
  });

  it("stops listening after unmount", () => {
    // Arrange
    setOnline(true);
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useOnline());

    // Act
    unmount();

    // Assert
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
