import { screen, within } from "@testing-library/react";
import { House, List } from "lucide-react";
import { describe, expect, it } from "vitest";
import { renderInRouter } from "../../test/render";
import { AppShell } from "./AppShell";
import type { NavItem } from "./nav";
import { Sidebar } from "./Sidebar";
import { SignageBand } from "./SignageBand";
import { TabBar } from "./TabBar";

const items: NavItem[] = [
  { id: "home", to: "/", label: "Home", icon: House, end: true },
  { id: "movements", to: "/movements", label: "Movements", icon: List },
  { id: "accounts", to: "/accounts", label: "Accounts", icon: House },
  { id: "reports", to: "/reports", label: "Reports", icon: List },
];
const action = { to: "/movements/new", label: "New movement" };

describe("TabBar", () => {
  it("places the add button between the second and third tab", () => {
    // Arrange
    renderInRouter(<TabBar label="Main navigation" items={items} action={action} />);

    // Act
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label") ?? link.textContent);

    // Assert
    expect(labels).toEqual(["Home", "Movements", "New movement", "Accounts", "Reports"]);
  });

  it("marks the current section", () => {
    // Arrange
    renderInRouter(<TabBar label="Main" items={items} action={action} />, "/movements");

    // Act
    const current = screen.getByRole("link", { current: "page" });

    // Assert
    expect(current.textContent).toBe("Movements");
  });

  it("does not mark home as current on other paths", () => {
    // Arrange
    renderInRouter(<TabBar label="Main" items={items} action={action} />, "/reports");

    // Act
    const home = screen.getByRole("link", { name: "Home" });

    // Assert
    expect(home.getAttribute("aria-current")).toBeNull();
  });
});

describe("Sidebar", () => {
  it("shows the brand, the main action first and the sections", () => {
    // Arrange
    renderInRouter(
      <Sidebar
        label="Main navigation"
        brandName="miPlata"
        items={items}
        action={action}
        menu={{ to: "/menu", label: "Menu" }}
      />,
      "/accounts",
    );

    // Act
    const links = screen.getAllByRole("link").map((link) => link.textContent);

    // Assert
    expect(screen.getByText("miPlata")).toBeDefined();
    expect(links).toEqual(["New movement", "Home", "Movements", "Accounts", "Reports", "Menu"]);
    expect(screen.getByRole("link", { current: "page" }).textContent).toBe("Accounts");
  });
});

describe("SignageBand", () => {
  const menu = { to: "/menu", label: "Menu" };

  it("shows the brand and the menu entry in the corner", () => {
    // Arrange
    renderInRouter(<SignageBand brandName="miPlata" menu={menu} />);

    // Act
    const heading = screen.getByRole("heading", { name: "miPlata" });

    // Assert
    expect(heading).toBeDefined();
    expect(screen.getByRole("link", { name: "Menu" }).getAttribute("href")).toBe("/menu");
    expect(screen.queryByText("Total balance")).toBeNull();
  });

  it("shows the balance as a link, the dollars and the month totals", () => {
    // Arrange
    renderInRouter(
      <SignageBand
        brandName="miPlata"
        menu={menu}
        balance={{
          label: "Total balance",
          to: "/balance",
          pesos: { amount: 1884300, currency: "ARS", locale: "es-AR" },
          dollars: { amount: 1450, currency: "USD", locale: "es-AR" },
        }}
        income={{
          label: "In",
          amount: { amount: 1250000, currency: "ARS", locale: "es-AR" },
        }}
        expense={{
          label: "Out",
          amount: { amount: 873400, currency: "ARS", locale: "es-AR" },
        }}
      />,
    );

    // Act
    const balance = screen.getByRole("link", { name: /Total balance/ });

    // Assert
    expect(balance.getAttribute("href")).toBe("/balance");
    expect(balance.textContent).toContain("1.884.300");
    expect(balance.textContent).toContain("US$");
    expect(screen.getByText("In").textContent).toContain("1.250.000");
    expect(screen.getByText("Out").textContent).toContain("873.400");
  });

  it("hides the dollars when they are zero", () => {
    // Arrange
    renderInRouter(
      <SignageBand
        brandName="miPlata"
        menu={menu}
        balance={{
          label: "Total balance",
          to: "/balance",
          pesos: { amount: 100, currency: "ARS", locale: "en-US" },
          dollars: { amount: 0, currency: "USD", locale: "en-US" },
        }}
      />,
    );

    // Act
    const balance = screen.getByRole("link", { name: /Total balance/ });

    // Assert
    expect(balance.textContent).not.toContain("US$");
  });
});

describe("AppShell", () => {
  it("renders sidebar, main content and tab bar", () => {
    // Arrange
    renderInRouter(
      <AppShell sidebar={<p>side</p>} tabBar={<p>tabs</p>}>
        <p>content</p>
      </AppShell>,
    );

    // Act
    const main = screen.getByRole("main");

    // Assert
    expect(main.textContent).toBe("content");
    expect(screen.getByText("side")).toBeDefined();
    expect(screen.getByText("tabs")).toBeDefined();
  });
});
