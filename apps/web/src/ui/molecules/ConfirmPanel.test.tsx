import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ComponentProps, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ConfirmPanel } from "./ConfirmPanel";

const panelProps = {
  title: "Delete Rent?",
  body: "It cannot be undone.",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
};

function renderPanel(overrides: Partial<ComponentProps<typeof ConfirmPanel>> = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ConfirmPanel {...panelProps} onConfirm={onConfirm} onCancel={onCancel} {...overrides} />);
  return { onConfirm, onCancel };
}

function OpenablePanel() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {open ? (
        <ConfirmPanel
          {...panelProps}
          onConfirm={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

describe("ConfirmPanel", () => {
  it("is a modal dialog named by its title and described by its body", () => {
    // Arrange
    renderPanel();

    // Act
    const dialog = screen.getByRole("alertdialog", { name: "Delete Rent?" });

    // Assert
    const descriptionId = dialog.getAttribute("aria-describedby");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(descriptionId).not.toBeNull();
    expect(document.getElementById(descriptionId ?? "")?.textContent).toBe("It cannot be undone.");
  });

  it("moves focus into the dialog when it opens", () => {
    // Arrange
    renderPanel();

    // Act
    const dialog = screen.getByRole("alertdialog");

    // Assert
    expect(document.activeElement).toBe(dialog);
  });

  it("closes with Escape", async () => {
    // Arrange
    const { onCancel } = renderPanel();

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("keeps Tab inside the dialog", async () => {
    // Arrange
    renderPanel();
    const confirm = screen.getByRole("button", { name: "Delete" });
    const cancel = screen.getByRole("button", { name: "Cancel" });

    // Act
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();

    // Assert
    expect(document.activeElement).toBe(confirm);
    expect(document.activeElement).not.toBe(cancel);
  });

  it("ignores Escape while busy", async () => {
    // Arrange
    const { onCancel } = renderPanel({ busy: true });

    // Act
    await userEvent.keyboard("{Escape}");

    // Assert
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("returns focus to the element that opened it when it closes", async () => {
    // Arrange
    render(<OpenablePanel />);
    const opener = screen.getByRole("button", { name: "Open" });
    await userEvent.click(opener);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Assert
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
