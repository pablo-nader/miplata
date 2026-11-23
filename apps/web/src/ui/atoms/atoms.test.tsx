import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Plus } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { renderInRouter } from "../../test/render";
import { MINUS, SPACE } from "../format/money";
import { AddButton } from "./AddButton";
import { Button, ButtonLink } from "./Button";
import { AddCategoryBadge, CategoryBadge, categoryColorFor, firstLetter } from "./CategoryBadge";
import { Chip, FilterChip } from "./Chip";
import { LineRule } from "./LineRule";
import { MoneyAmount } from "./MoneyAmount";
import { ProgressBar } from "./ProgressBar";
import { SectionLabel } from "./SectionLabel";
import { Switch } from "./Switch";
import { TextInput } from "./TextInput";

describe("Button", () => {
  it("renders the main variant by default and handles clicks", async () => {
    // Arrange
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save expense</Button>);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Save expense" }));

    // Assert
    expect(screen.getByRole("button").className).toContain("button--main");
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the ghost variant with an icon and ignores clicks when disabled", async () => {
    // Arrange
    const onClick = vi.fn();
    render(
      <Button variant="ghost" icon={<Plus data-testid="icon" />} disabled onClick={onClick}>
        Add charge
      </Button>,
    );

    // Act
    await userEvent.click(screen.getByRole("button"));

    // Assert
    expect(screen.getByRole("button").className).toContain("button--ghost");
    expect(screen.getByTestId("icon")).toBeDefined();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders a link styled as a button", () => {
    // Arrange
    renderInRouter(<ButtonLink to="/movements/new">New movement</ButtonLink>);

    // Act
    const link = screen.getByRole("link", { name: "New movement" });

    // Assert
    expect(link.getAttribute("href")).toBe("/movements/new");
    expect(link.className).toContain("button--main");
  });
});

describe("AddButton", () => {
  it("is a link with an accessible name", () => {
    // Arrange
    renderInRouter(<AddButton to="/movements/new" label="New movement" />);

    // Act
    const link = screen.getByRole("link", { name: "New movement" });

    // Assert
    expect(link.getAttribute("href")).toBe("/movements/new");
  });
});

describe("CategoryBadge", () => {
  it("shows the Lucide icon when the name is known", () => {
    // Arrange
    const { container } = render(<CategoryBadge name="Groceries" icon="shopping-cart" color={1} />);

    // Act
    const hasIcon = container.querySelector("svg.lucide-shopping-cart") !== null;

    // Assert
    expect(hasIcon).toBe(true);
    expect(container.textContent).toBe("");
  });

  it("falls back to the first letter when the icon is unknown or missing", () => {
    // Arrange
    const { container: unknown } = render(<CategoryBadge name="food" icon="nope" color={2} />);
    const { container: missing } = render(<CategoryBadge name="Rent" color={3} />);

    // Act
    const letters = [unknown.textContent, missing.textContent];

    // Assert
    expect(letters).toEqual(["F", "R"]);
    expect(unknown.querySelector("svg")).toBeNull();
  });

  it("is decorative by default and labelled when standalone", () => {
    // Arrange
    render(
      <>
        <span data-testid="decorative">
          <CategoryBadge name="Health" color={4} />
        </span>
        <CategoryBadge name="Pharmacy" icon="pill" color={4} standalone />
      </>,
    );

    // Act
    const decorative = screen.getByTestId("decorative").firstElementChild;

    // Assert
    expect(decorative?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("img", { name: "Pharmacy" })).toBeDefined();
  });

  it("applies color, size and selected state classes", () => {
    // Arrange
    const { container } = render(<CategoryBadge name="Car" color={3} size="picker" selected />);

    // Act
    const classes = container.firstElementChild?.className ?? "";

    // Assert
    expect(classes).toContain("category-badge--color-3");
    expect(classes).toContain("category-badge--picker");
    expect(classes).toContain("category-badge--selected");
  });

  it("repeats colors when there are more categories than colors", () => {
    // Arrange
    const indexes = [0, 4, 5, 11, -1];

    // Act
    const colors = indexes.map(categoryColorFor);

    // Assert
    expect(colors).toEqual([1, 5, 1, 2, 5]);
  });

  it("takes the first letter of the first character, even outside the BMP", () => {
    // Arrange
    const names = ["  ñandú", "", "   ", "😀 smile"];

    // Act
    const letters = names.map(firstLetter);

    // Assert
    expect(letters).toEqual(["Ñ", "?", "?", "😀"]);
  });

  it("renders the add category badge as decorative", () => {
    // Arrange
    const { container } = render(<AddCategoryBadge size="picker" />);

    // Act
    const badge = container.firstElementChild;

    // Assert
    expect(badge?.className).toContain("category-badge--add");
    expect(badge?.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("MoneyAmount", () => {
  it("formats an expense with the Unicode minus and no income color", () => {
    // Arrange
    render(<MoneyAmount amount={48300} currency="ARS" locale="es-AR" direction="expense" />);

    // Act
    const element = screen.getByText(`${MINUS}${SPACE}$${SPACE}48.300`, {
      normalizer: (text) => text,
    });

    // Assert
    expect(element.className).toBe("money");
  });

  it("colors income amounts", () => {
    // Arrange
    render(<MoneyAmount amount={1250000} currency="ARS" locale="en-US" direction="income" />);

    // Act
    const element = screen.getByText(`+${SPACE}$${SPACE}1,250,000`, { normalizer: (text) => text });

    // Assert
    expect(element.className).toContain("money--income");
  });

  it("does not color a zero income amount", () => {
    // Arrange
    render(<MoneyAmount amount={0} currency="USD" locale="es-AR" direction="income" />);

    // Act
    const element = screen.getByText(`US$${SPACE}0`, { normalizer: (text) => text });

    // Assert
    expect(element.className).toBe("money");
  });
});

describe("Switch", () => {
  it("exposes its state and toggles with click and keyboard", async () => {
    // Arrange
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Belongs to someone else" />);
    const control = screen.getByRole("switch", { name: "Belongs to someone else" });

    // Act
    await userEvent.click(control);
    control.focus();
    await userEvent.keyboard(" ");

    // Assert
    expect(control.getAttribute("aria-checked")).toBe("false");
    expect(onChange).toHaveBeenNthCalledWith(1, true);
    expect(onChange).toHaveBeenNthCalledWith(2, true);
  });

  it("reports unchecking and stays inert when disabled", async () => {
    // Arrange
    const onChange = vi.fn();
    const { rerender } = render(<Switch checked onChange={onChange} label="Flag" />);

    // Act
    await userEvent.click(screen.getByRole("switch"));
    rerender(<Switch checked onChange={onChange} label="Flag" disabled />);
    await userEvent.click(screen.getByRole("switch"));

    // Assert
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
  });
});

describe("Chip and FilterChip", () => {
  it("renders a static chip", () => {
    // Arrange
    render(<Chip>1/3</Chip>);

    // Act
    const chip = screen.getByText("1/3");

    // Assert
    expect(chip.className).toBe("chip");
  });

  it("exposes the pressed state and reacts to clicks", async () => {
    // Arrange
    const onClick = vi.fn();
    render(<FilterChip label="November" selected onClick={onClick} icon={<Plus />} />);
    const chip = screen.getByRole("button", { name: "November" });

    // Act
    await userEvent.click(chip);

    // Assert
    expect(chip.getAttribute("aria-pressed")).toBe("true");
    expect(chip.className).toContain("filter-chip--selected");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is not pressed by default", () => {
    // Arrange
    render(<FilterChip label="Account" />);

    // Act
    const chip = screen.getByRole("button", { name: "Account" });

    // Assert
    expect(chip.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("text and layout atoms", () => {
  it("renders a text input with a custom class", () => {
    // Arrange
    render(<TextInput aria-label="Description" className="extra" />);

    // Act
    const input = screen.getByRole("textbox", { name: "Description" });

    // Assert
    expect(input.className).toBe("text-input extra");
  });

  it("renders the section label as a heading by default and as a paragraph on request", () => {
    // Arrange
    render(
      <>
        <SectionLabel>Latest movements</SectionLabel>
        <SectionLabel as="p">Pesos</SectionLabel>
      </>,
    );

    // Act
    const heading = screen.getByRole("heading", { name: "Latest movements" });

    // Assert
    expect(heading.tagName).toBe("H2");
    expect(screen.getByText("Pesos").tagName).toBe("P");
  });

  it("renders line rules by tone", () => {
    // Arrange
    render(
      <>
        <LineRule tone="income">In</LineRule>
        <LineRule tone="expense">Out</LineRule>
      </>,
    );

    // Act
    const classes = [screen.getByText("In").className, screen.getByText("Out").className];

    // Assert
    expect(classes[0]).toContain("line-rule--income");
    expect(classes[1]).toContain("line-rule--expense");
  });
});

describe("ProgressBar", () => {
  it("exposes progress values and stays neutral under the threshold", () => {
    // Arrange
    render(<ProgressBar value={50} max={100} label="Groceries" />);

    // Act
    const bar = screen.getByRole("progressbar", { name: "Groceries" });

    // Assert
    expect(bar.getAttribute("aria-valuenow")).toBe("50");
    expect(bar.getAttribute("aria-valuemax")).toBe("100");
    expect(bar.className).not.toContain("near");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("50%");
  });

  it("turns to the action color near the cap and clamps over it", () => {
    // Arrange
    render(<ProgressBar value={140} max={100} label="Over" />);

    // Act
    const bar = screen.getByRole("progressbar");

    // Assert
    expect(bar.className).toContain("progress-bar--near");
    expect(bar.getAttribute("aria-valuenow")).toBe("100");
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("100%");
  });

  it("handles an empty cap", () => {
    // Arrange
    render(<ProgressBar value={10} max={0} label="No cap" />);

    // Act
    const bar = screen.getByRole("progressbar");

    // Assert
    expect((bar.firstElementChild as HTMLElement).style.width).toBe("0%");
  });
});
