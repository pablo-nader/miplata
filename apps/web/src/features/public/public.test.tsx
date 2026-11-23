import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "../../app/AppRoutes";
import { type Language, resources } from "../../app/i18n";
import { renderApp } from "../../test/render";
import { contactEmail } from "./contact";

const languages: Language[] = ["es", "en"];

describe("landing page", () => {
  it.each(languages)("describes the app and offers Google sign in in %s", (language) => {
    // Arrange
    const text = resources[language].translation.public.landing;
    renderApp(<AppRoutes />, language, "/");

    // Act
    const heading = screen.getByRole("heading", { level: 1 });
    const signIn = screen.getByRole("link", { name: text.signIn });

    // Assert
    expect(heading.textContent).toBe("miPlata");
    expect(screen.getByText(text.tagline)).toBeDefined();
    expect(screen.getByText(text.description)).toBeDefined();
    expect(signIn.getAttribute("href")).toBe("/sign-in");
    for (const point of text.points) expect(screen.getByText(point)).toBeDefined();
  });

  it.each(languages)("links the privacy policy and the terms in %s", (language) => {
    // Arrange
    const footer = resources[language].translation.public.footer;
    renderApp(<AppRoutes />, language, "/");

    // Act
    const privacy = screen.getByRole("link", { name: footer.privacy });
    const terms = screen.getByRole("link", { name: footer.terms });

    // Assert
    expect(privacy.getAttribute("href")).toBe("/privacy");
    expect(terms.getAttribute("href")).toBe("/terms");
  });

  it("has a single main landmark and no app navigation", () => {
    // Arrange
    renderApp(<AppRoutes />, "es", "/");

    // Act
    const landmarks = screen.getAllByRole("main");
    const navigations = screen.queryAllByRole("navigation", { name: "Navegación principal" });

    // Assert
    expect(landmarks).toHaveLength(1);
    expect(navigations).toHaveLength(0);
  });
});

describe.each([
  ["/privacy", "privacy"],
  ["/terms", "terms"],
] as const)("%s", (path, key) => {
  it.each(languages)("renders every section and the contact in %s", (language) => {
    // Arrange
    const text = resources[language].translation.legal[key];
    renderApp(<AppRoutes />, language, path);

    // Act
    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    const mail = screen.getByRole("link", { name: contactEmail });

    // Assert
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(text.title);
    expect(headings).toEqual([
      ...text.sections.map((section) => section.heading),
      resources[language].translation.legal.contact.heading,
    ]);
    expect(mail.getAttribute("href")).toBe(`mailto:${contactEmail}`);
  });

  it("shows the last updated date formatted for the language", () => {
    // Arrange
    renderApp(<AppRoutes />, "en", path);

    // Act
    const updated = screen.getByText(/^Last updated:/);

    // Assert
    expect(updated.textContent).toBe("Last updated: November 23, 2026");
  });

  it("links back to the home page", () => {
    // Arrange
    renderApp(<AppRoutes />, "es", path);

    // Act
    const home = screen.getByRole("link", { name: "miPlata" });

    // Assert
    expect(home.getAttribute("href")).toBe("/");
  });
});

describe("privacy policy content", () => {
  it.each(languages)("names the providers and the storage region in %s", (language) => {
    // Arrange
    const text = JSON.stringify(resources[language].translation.legal.privacy);

    // Act
    const mentions = ["São Paulo", "Neon", "Vercel", "Google"].map((word) => text.includes(word));

    // Assert
    expect(mentions).toEqual([true, true, true, true]);
  });
});

describe("language switch", () => {
  it("changes the language of the page and the document", async () => {
    // Arrange
    renderApp(<AppRoutes />, "es", "/privacy");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "English" }));

    // Assert
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Privacy policy");
    expect(document.documentElement.lang).toBe("en");
  });

  it("marks the active language", () => {
    // Arrange
    renderApp(<AppRoutes />, "en", "/terms");

    // Act
    const group = screen.getByRole("group", { name: "Language" });
    const pressed = within(group).getByRole("button", { pressed: true });

    // Assert
    expect(pressed.textContent).toBe("English");
  });
});
