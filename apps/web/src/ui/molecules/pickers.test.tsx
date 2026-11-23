import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CategoryPicker, type PickerItem, type PickerSection } from "./CategoryPicker";
import { ColorPicker } from "./ColorPicker";
import { ConfirmPanel } from "./ConfirmPanel";
import { IconPicker } from "./IconPicker";

function item(id: string, name: string, icon: string | null = null): PickerItem {
  return { id, name, icon, color: 1 };
}

const sections: PickerSection[] = [
  { id: "home", title: "Home", items: [item("rent", "Rent", "key"), item("fix", "Repairs")] },
  { id: "food", title: "Food", items: [item("shop", "Groceries"), item("out", "Dining out")] },
  { id: "misc", title: "Misc", items: [item("pets", "Pets"), item("gym", "Gym")] },
  { id: "none", title: "Empty", items: [] },
];

function captions() {
  return screen
    .getAllByRole("button")
    .map((button) => button.querySelector(".badge-choice__caption")?.textContent);
}

function renderPicker(overrides: Partial<Parameters<typeof CategoryPicker>[0]> = {}) {
  const onSelect = vi.fn();
  render(
    <CategoryPicker
      label="Category"
      sections={sections}
      selectedId={null}
      onSelect={onSelect}
      searchLabel="Search"
      emptyLabel="Nothing"
      selector={selectorCopy}
      {...overrides}
    />,
  );
  return onSelect;
}

const selectorCopy = {
  title: "Choose",
  searchLabel: "Search field",
  placeholder: "Type",
  closeLabel: "Close",
  noResults: "No matches",
  selectedLabel: "Selected",
  addLabel: "Add category",
};

describe("CategoryPicker", () => {
  it("shows the first four categories and a search button", () => {
    // Arrange
    renderPicker();

    // Act
    const names = captions();

    // Assert
    expect(names).toEqual(["Rent", "Repairs", "Groceries", "Dining out", "Search"]);
  });

  it("reports the picked category and marks it as pressed", async () => {
    // Arrange
    const onSelect = renderPicker({ selectedId: "fix" });

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Groceries" }));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("shop");
    expect(screen.getByRole("button", { name: "Repairs" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Rent" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("keeps a selected category that is beyond the first four visible", () => {
    // Arrange
    renderPicker({ selectedId: "gym" });

    // Act
    const names = captions();

    // Assert
    expect(names).toEqual(["Rent", "Repairs", "Groceries", "Gym", "Search"]);
  });

  it("puts the preferred ids first and fills up to four with the default order", () => {
    // Arrange
    renderPicker({ featuredIds: ["pets", "rent", "missing"] });

    // Act
    const names = captions();

    // Assert
    expect(names).toEqual(["Pets", "Rent", "Repairs", "Groceries", "Search"]);
  });

  it("opens the selector, lists every category by group and picks one", async () => {
    // Arrange
    const onSelect = renderPicker();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Search" }));
    const dialog = screen.getByRole("dialog", { name: "Choose" });
    const hasGroup = within(dialog).queryByText("Misc") !== null;
    const hasEmptyGroup = within(dialog).queryByText("Empty") !== null;
    await userEvent.click(within(dialog).getByRole("option", { name: "Gym" }));

    // Assert
    expect(hasGroup).toBe(true);
    expect(hasEmptyGroup).toBe(false);
    expect(onSelect).toHaveBeenCalledWith("gym");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("focuses the search field on open and returns focus to the button on close", async () => {
    // Arrange
    renderPicker();
    const opener = screen.getByRole("button", { name: "Search" });

    // Act
    await userEvent.click(opener);
    const focusedOnOpen = document.activeElement === screen.getByRole("searchbox");
    await userEvent.click(screen.getByRole("button", { name: "Close" }));

    // Assert
    expect(focusedOnOpen).toBe(true);
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });

  it("filters by category and by group name and marks the selected one", async () => {
    // Arrange
    renderPicker({ selectedId: "shop" });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    // Act
    await userEvent.type(screen.getByRole("searchbox"), "FOOD");
    const byGroup = screen.getAllByRole("option").map((option) => option.textContent);
    const selected = screen
      .getAllByRole("option")
      .filter((option) => option.getAttribute("aria-selected") === "true")
      .map((option) => option.textContent);

    // Assert
    expect(byGroup).toEqual(["GGroceriesSelected", "DDining out"]);
    expect(selected).toEqual(["GGroceriesSelected"]);
  });

  it("tells when nothing matches", async () => {
    // Arrange
    renderPicker();
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    // Act
    await userEvent.type(screen.getByRole("searchbox"), "qqq");

    // Assert
    expect(screen.getByText("No matches")).toBeDefined();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });

  it("offers the add shortcut only when it can be used", async () => {
    // Arrange
    const onAdd = vi.fn();
    const { unmount } = render(
      <CategoryPicker
        label="Category"
        sections={sections}
        selectedId={null}
        onSelect={vi.fn()}
        searchLabel="Search"
        emptyLabel="Nothing"
        selector={selectorCopy}
        onAdd={onAdd}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Add category" }));
    unmount();
    renderPicker();
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    // Assert
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Add category" })).toBeNull();
  });

  it("walks the options with the arrow keys, wraps Tab inside and closes with Escape", async () => {
    // Arrange
    renderPicker({ onAdd: vi.fn() });
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    // Act
    await userEvent.keyboard("{ArrowDown}");
    const first = document.activeElement?.textContent;
    await userEvent.keyboard("{ArrowDown}{ArrowUp}");
    const backToFirst = document.activeElement?.textContent;
    await userEvent.keyboard("{ArrowDown>8/}");
    const last = document.activeElement?.textContent;
    await userEvent.keyboard("{Tab}");
    const wrapped = document.activeElement?.getAttribute("aria-label");
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(first).toBe("Rent");
    expect(backToFirst).toBe("Rent");
    expect(last).toBe("Add category");
    expect(wrapped).toBe("Close");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("selects the first result when pressing Enter in the search field", async () => {
    // Arrange
    const onSelect = renderPicker();
    await userEvent.click(screen.getByRole("button", { name: "Search" }));

    // Act
    await userEvent.type(screen.getByRole("searchbox"), "dining{Enter}");

    // Assert
    expect(onSelect).toHaveBeenCalledWith("out");
  });

  it("shows the first letter when a category has no icon", () => {
    // Arrange
    renderPicker();

    // Act
    const repairs = screen.getByRole("button", { name: "Repairs" });

    // Assert
    expect(repairs.querySelector(".category-badge__letter")?.textContent).toBe("R");
    expect(screen.getByRole("button", { name: "Rent" }).querySelector("svg")).not.toBeNull();
  });

  it("says so when there is nothing to pick", () => {
    // Arrange
    renderPicker({ sections: [{ id: "home", title: "Home", items: [] }] });

    // Act
    const message = screen.getByText("Nothing");

    // Assert
    expect(message).toBeDefined();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("IconPicker", () => {
  const options = [
    { name: "key", label: "Key" },
    { name: "car", label: "Car" },
  ];

  it("offers no icon plus every option and reports the choice", async () => {
    // Arrange
    const onSelect = vi.fn();
    render(
      <IconPicker
        label="Icon"
        noIconLabel="No icon"
        options={options}
        value="key"
        color={2}
        fallbackName="Rent"
        onSelect={onSelect}
      />,
    );

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Car" }));
    await userEvent.click(screen.getByRole("button", { name: "No icon" }));

    // Assert
    expect(onSelect.mock.calls).toEqual([["car"], [null]]);
    expect(screen.getByRole("button", { name: "Key" }).getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("button", { name: "No icon" }).querySelector(".category-badge__letter")
        ?.textContent,
    ).toBe("R");
  });
});

describe("ColorPicker", () => {
  it("marks the current color and reports the new one", async () => {
    // Arrange
    const onSelect = vi.fn();
    render(
      <ColorPicker
        label="Color"
        swatchName="Rent"
        options={[
          { value: 1, label: "Color 1" },
          { value: 2, label: "Color 2" },
        ]}
        value={2}
        onSelect={onSelect}
      />,
    );

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Color 1" }));

    // Assert
    expect(onSelect).toHaveBeenCalledWith(1);
    expect(screen.getByRole("button", { name: "Color 2" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
  });
});

describe("ConfirmPanel", () => {
  it("takes focus and reports confirm and cancel", async () => {
    // Arrange
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmPanel
        title="Delete Rent?"
        body="It cannot be undone."
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    // Act
    const panel = screen.getByRole("alertdialog", { name: "Delete Rent?" });
    const focused = document.activeElement;
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert
    expect(focused).toBe(panel);
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("cancels with Escape unless busy", async () => {
    // Arrange
    const onCancel = vi.fn();
    render(
      <ConfirmPanel
        title="t"
        body="b"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("disables both buttons while busy", () => {
    // Arrange
    render(
      <ConfirmPanel
        title="t"
        body="b"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={() => {}}
        onCancel={() => {}}
        busy
      />,
    );

    // Act
    const buttons = screen.getAllByRole("button") as HTMLButtonElement[];

    // Assert
    expect(buttons.map((button) => button.disabled)).toEqual([true, true]);
  });
});
