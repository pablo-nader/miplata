import { describe, expect, it } from "vitest";
import { installState, isIosDevice, isStandaloneDisplay, showsInstallHint } from "./install-state";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const IPAD_SAFARI_DESKTOP_MODE =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

describe("installState", () => {
  it("reports installed when the app runs standalone", () => {
    // Arrange
    const signals = { standalone: true, ios: true, promptAvailable: true };

    // Act
    const state = installState(signals);

    // Assert
    expect(state).toBe("installed");
  });

  it("prefers the install prompt when the browser offers one", () => {
    // Arrange
    const signals = { standalone: false, ios: false, promptAvailable: true };

    // Act
    const state = installState(signals);

    // Assert
    expect(state).toBe("prompt");
  });

  it("uses the iOS steps on iOS without a prompt", () => {
    // Arrange
    const signals = { standalone: false, ios: true, promptAvailable: false };

    // Act
    const state = installState(signals);

    // Assert
    expect(state).toBe("ios");
  });

  it("falls back to the browser menu elsewhere", () => {
    // Arrange
    const signals = { standalone: false, ios: false, promptAvailable: false };

    // Act
    const state = installState(signals);

    // Assert
    expect(state).toBe("browser");
  });
});

describe("isIosDevice", () => {
  it("detects iPhone and iPad user agents", () => {
    // Arrange
    const iphone = IPHONE_SAFARI;

    // Act
    const detected = isIosDevice(iphone, 5);

    // Assert
    expect(detected).toBe(true);
  });

  it("detects iPad that requests the desktop site", () => {
    // Arrange
    const ipad = IPAD_SAFARI_DESKTOP_MODE;

    // Act
    const detected = isIosDevice(ipad, 5);

    // Assert
    expect(detected).toBe(true);
  });

  it("does not treat a real Mac as iOS", () => {
    // Arrange
    const mac = IPAD_SAFARI_DESKTOP_MODE;

    // Act
    const detected = isIosDevice(mac, 0);

    // Assert
    expect(detected).toBe(false);
  });

  it("does not treat Android or desktop Chrome as iOS", () => {
    // Arrange
    const agents = [ANDROID_CHROME, DESKTOP_CHROME];

    // Act
    const detected = agents.map((agent) => isIosDevice(agent, 5));

    // Assert
    expect(detected).toEqual([false, false]);
  });
});

describe("isStandaloneDisplay", () => {
  it("reads the display-mode media query", () => {
    // Arrange
    const media = { matches: true };

    // Act
    const standalone = isStandaloneDisplay(media, undefined);

    // Assert
    expect(standalone).toBe(true);
  });

  it("reads the iOS navigator.standalone flag", () => {
    // Arrange
    const media = { matches: false };

    // Act
    const standalone = isStandaloneDisplay(media, true);

    // Assert
    expect(standalone).toBe(true);
  });

  it("is false in a normal browser tab", () => {
    // Arrange
    const media = { matches: false };

    // Act
    const standalone = isStandaloneDisplay(media, undefined);

    // Assert
    expect(standalone).toBe(false);
  });
});

describe("showsInstallHint", () => {
  it("shows the hint for iOS and prompt states that were not dismissed", () => {
    // Arrange
    const states = ["ios", "prompt"] as const;

    // Act
    const shown = states.map((state) => showsInstallHint(state, false));

    // Assert
    expect(shown).toEqual([true, true]);
  });

  it("hides the hint once it was dismissed", () => {
    // Arrange
    const state = "ios";

    // Act
    const shown = showsInstallHint(state, true);

    // Assert
    expect(shown).toBe(false);
  });

  it("hides the hint when the app is installed or the browser has no hint", () => {
    // Arrange
    const states = ["installed", "browser"] as const;

    // Act
    const shown = states.map((state) => showsInstallHint(state, false));

    // Assert
    expect(shown).toEqual([false, false]);
  });
});
