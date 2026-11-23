import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderInRouter } from "../../test/render";
import { AccountBadge } from "../atoms/AccountBadge";
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
