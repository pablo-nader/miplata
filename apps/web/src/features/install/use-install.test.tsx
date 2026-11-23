import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

async function loadInstall() {
  vi.resetModules();
  return import("./use-install");
}

function dispatchBeforeInstall(prompt: () => Promise<unknown>) {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), { prompt });
  window.dispatchEvent(event);
  return event;
}

describe("useInstall", () => {
  it("keeps a prompt that fired before the screen mounted", async () => {
    // Arrange
    const { useInstall } = await loadInstall();
    dispatchBeforeInstall(async () => undefined);

    // Act
    const { result } = renderHook(() => useInstall());

    // Assert
    expect(result.current.state).toBe("prompt");
    expect(result.current.install).not.toBeNull();
  });

  it("runs the prompt once and then stops offering the action", async () => {
    // Arrange
    const { useInstall } = await loadInstall();
    const prompt = vi.fn(async () => undefined);
    dispatchBeforeInstall(prompt);
    const { result } = renderHook(() => useInstall());

    // Act
    await act(async () => {
      await result.current.install?.();
    });

    // Assert
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.install).toBeNull();
    expect(result.current.state).toBe("browser");
  });

  it("reports installed once the browser confirms the install", async () => {
    // Arrange
    const { useInstall } = await loadInstall();
    dispatchBeforeInstall(async () => undefined);
    const { result } = renderHook(() => useInstall());

    // Act
    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    // Assert
    expect(result.current.state).toBe("installed");
    expect(result.current.install).toBeNull();
  });
});
