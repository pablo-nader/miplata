import { render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createI18n } from "../../app/i18n";
import { LocaleSync } from "./LocaleSync";
import type { SessionState } from "./useSession";

let state: SessionState;

vi.mock("./useSession", () => ({ useSession: () => state }));

const refresh = async () => {};

describe("LocaleSync", () => {
  beforeEach(() => {
    state = { status: "signedOut", user: null, refresh };
  });

  it("switches the interface to the signed-in user's locale", async () => {
    // Arrange
    const i18n = createI18n("es");
    state = {
      status: "signedIn",
      user: { id: "1", name: "Ana", email: "a@b.c", image: null, locale: "en" },
      refresh,
    };

    // Act
    render(
      <I18nextProvider i18n={i18n}>
        <LocaleSync />
      </I18nextProvider>,
    );

    // Assert
    await waitFor(() => expect(i18n.language).toBe("en"));
    expect(document.documentElement.lang).toBe("en");
  });

  it("keeps the detected language while signed out", () => {
    // Arrange
    const i18n = createI18n("en");

    // Act
    render(
      <I18nextProvider i18n={i18n}>
        <LocaleSync />
      </I18nextProvider>,
    );

    // Assert
    expect(i18n.language).toBe("en");
  });
});
