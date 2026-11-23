import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInRouter } from "../../test/render";
import { AccountBadge, logoSource } from "../atoms/AccountBadge";
import { MovementList, MovementRow } from "./MovementRow";
import { ScreenHeader } from "./ScreenHeader";

describe("ScreenHeader", () => {
  it("renders the title as the page heading", () => {
    // Arrange
    renderInRouter(<ScreenHeader title="Accounts" />);

    // Act
    const heading = screen.getByRole("heading", { level: 1 });

    // Assert
    expect(heading.textContent).toBe("Accounts");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers a back link and an action link", () => {
    // Arrange
    renderInRouter(
      <ScreenHeader
        title="Accounts"
        back={{ to: "/home", label: "Back" }}
        action={{ to: "/accounts/new", label: "Add" }}
      />,
    );

    // Act
    const back = screen.getByRole("link", { name: "Back" });
    const add = screen.getByRole("link", { name: "Add" });

    // Assert
    expect(back.getAttribute("href")).toBe("/home");
    expect(add.getAttribute("href")).toBe("/accounts/new");
  });
});

describe("AccountBadge", () => {
  it.each(["cash", "bank", "wallet", "credit_card", "person"] as const)(
    "renders an icon for %s that is hidden from assistive technology",
    (type) => {
      // Arrange
      const { container } = render(<AccountBadge type={type} />);

      // Act
      const badge = container.querySelector(".account-badge");

      // Assert
      expect(badge?.getAttribute("aria-hidden")).toBe("true");
      expect(badge?.querySelector("svg")).not.toBeNull();
    },
  );
});

describe("AccountBadge with an institution logo", () => {
  const galicia = { name: "Galicia", logoPath: "/institutions/galicia.svg" };

  it("shows the logo instead of the type icon and hides it from assistive technology", () => {
    // Arrange
    const { container } = render(<AccountBadge type="bank" logo={galicia} />);

    // Act
    const badge = container.querySelector(".account-badge");

    // Assert
    expect(badge?.getAttribute("aria-hidden")).toBe("true");
    expect(badge?.querySelector("img")?.getAttribute("src")).toBe("/institutions/galicia.svg");
    expect(badge?.querySelector("svg")).toBeNull();
  });

  it("names the institution when the badge stands alone", () => {
    // Arrange
    render(<AccountBadge type="bank" logo={galicia} standalone />);

    // Act
    const badge = screen.getByRole("img", { name: "Galicia" });

    // Assert
    expect(badge.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it.each([
    ["no institution", null],
    ["an institution without a logo", { name: "Brubank", logoPath: null }],
    [
      "a logo outside the institutions folder",
      { name: "Evil", logoPath: "https://evil.test/a.svg" },
    ],
  ])("keeps the type icon for %s", (_label, logo) => {
    // Arrange
    const { container } = render(<AccountBadge type="bank" logo={logo} />);

    // Act
    const badge = container.querySelector(".account-badge");

    // Assert
    expect(badge?.querySelector("svg")).not.toBeNull();
    expect(badge?.querySelector("img")).toBeNull();
  });

  it("falls back to the type icon when the logo file fails to load", () => {
    // Arrange
    const { container } = render(<AccountBadge type="bank" logo={galicia} />);

    // Act
    fireEvent.error(container.querySelector("img") as HTMLImageElement);

    // Assert
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".account-badge svg")).not.toBeNull();
  });

  it("keeps naming the institution on the type icon when a standalone logo fails to load", () => {
    // Arrange
    const { container } = render(<AccountBadge type="bank" logo={galicia} standalone />);

    // Act
    fireEvent.error(container.querySelector("img") as HTMLImageElement);

    // Assert
    expect(screen.getByRole("img", { name: "Galicia" }).querySelector("svg")).not.toBeNull();
  });
});

describe("logoSource", () => {
  it.each([
    [{ name: "A", logoPath: "/institutions/a.svg" }, "/institutions/a.svg"],
    [{ name: "A", logoPath: "/institutions/a.png" }, null],
    [{ name: "A", logoPath: "/institutions/../a.svg" }, null],
    [{ name: "A", logoPath: "/institutions//evil.test/a.svg" }, null],
    [{ name: "A", logoPath: "//evil.test/institutions/a.svg" }, null],
    [{ name: "A", logoPath: null }, null],
    [null, null],
    [undefined, null],
  ])("resolves %j to %s", (logo, expected) => {
    // Arrange
    const input = logo;

    // Act
    const source = logoSource(input);

    // Assert
    expect(source).toBe(expected);
  });
});

describe("MovementRow as a link", () => {
  it("wraps the row content in a link when a destination is given", () => {
    // Arrange
    renderInRouter(
      <MovementList>
        <MovementRow
          badge={null}
          title="Galicia"
          caption="Bank"
          amount="$ 1"
          to="/accounts/1/edit"
        />
      </MovementList>,
    );

    // Act
    const link = screen.getByRole("link", { name: /Galicia/ });

    // Assert
    expect(link.getAttribute("href")).toBe("/accounts/1/edit");
  });

  it("stays plain without a destination", () => {
    // Arrange
    renderInRouter(
      <MovementList>
        <MovementRow badge={null} title="Galicia" caption="Bank" amount="$ 1" />
      </MovementList>,
    );

    // Act
    const links = screen.queryAllByRole("link");

    // Assert
    expect(links).toHaveLength(0);
  });
});
