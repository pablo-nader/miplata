import { render, screen } from "@testing-library/react";
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
      allLabel="All"
      fewerLabel="Fewer"
      emptyLabel="Nothing"
      {...overrides}
    />,
  );
  return onSelect;
}

describe("CategoryPicker", () => {
  it("shows the first four categories and an All button", () => {
    // Arrange
    renderPicker();

    // Act
    const names = captions();

    // Assert
    expect(names).toEqual(["Rent", "Repairs", "Groceries", "Dining out", "All"]);
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
    expect(names).toEqual(["Rent", "Repairs", "Groceries", "Gym", "All"]);
  });

  it("prefers the featured ids when given", () => {
    // Arrange
    renderPicker({ featuredIds: ["pets", "rent", "missing"] });

    // Act
    const names = captions();

    // Assert
    expect(names).toEqual(["Pets", "Rent", "All"]);
  });

  it("expands to every category grouped by title and collapses again", async () => {
    // Arrange
    const onSelect = renderPicker();

    // Act
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    const expanded = screen.getByRole("button", { name: "Fewer" }).getAttribute("aria-expanded");
    const hasTitle = screen.queryByText("Misc") !== null;
    const hasEmptySection = screen.queryByText("Empty") !== null;
    await userEvent.click(screen.getByRole("button", { name: "Gym" }));
    await userEvent.click(screen.getByRole("button", { name: "Fewer" }));

    // Assert
    expect(expanded).toBe("true");
    expect(hasTitle).toBe(true);
    expect(hasEmptySection).toBe(false);
    expect(onSelect).toHaveBeenCalledWith("gym");
    expect(screen.getByRole("button", { name: "All" }).getAttribute("aria-expanded")).toBe("false");
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
