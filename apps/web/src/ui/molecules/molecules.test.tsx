import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CategoryBadge } from "../atoms/CategoryBadge";
import { MoneyAmount } from "../atoms/MoneyAmount";
import { EmptyState } from "./EmptyState";
import { Field, FieldGroup } from "./Field";
import { MovementList, MovementRow } from "./MovementRow";
import { SegmentedControl } from "./SegmentedControl";

const options = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfer" },
];

function Controlled() {
  const [value, setValue] = useState("expense");
  return <SegmentedControl label="Type" options={options} value={value} onChange={setValue} />;
}

describe("Field", () => {
  it("associates the caption with the input", async () => {
    // Arrange
    render(<Field label="Description" />);

    // Act
    await userEvent.type(screen.getByLabelText("Description"), "Fridge");

    // Assert
    expect((screen.getByLabelText("Description") as HTMLInputElement).value).toBe("Fridge");
  });

  it("links the error message to the input", () => {
    // Arrange
    render(<Field label="Amount" error="Enter an amount" />);

    // Act
    const input = screen.getByLabelText("Amount");
    const error = screen.getByText("Enter an amount");

    // Assert
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
  });

  it("is not invalid without an error", () => {
    // Arrange
    render(<Field label="Date" />);

    // Act
    const input = screen.getByLabelText("Date");

    // Assert
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("groups fields under an accessible name", () => {
    // Arrange
    render(
      <FieldGroup label="Details">
        <Field label="Description" />
      </FieldGroup>,
    );

    // Act
    const group = screen.getByRole("group", { name: "Details" });

    // Assert
    expect(group.contains(screen.getByLabelText("Description"))).toBe(true);
  });
});

describe("SegmentedControl", () => {
  it("checks only the selected option", () => {
    // Arrange
    render(<Controlled />);

    // Act
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];

    // Assert
    expect(radios.map((radio) => radio.checked)).toEqual([true, false, false]);
    expect(screen.getByRole("group", { name: "Type" })).toBeDefined();
  });

  it("selects with a click", async () => {
    // Arrange
    render(<Controlled />);

    // Act
    await userEvent.click(screen.getByRole("radio", { name: "Transfer" }));

    // Assert
    expect((screen.getByRole("radio", { name: "Transfer" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it("moves selection with arrow keys, wrapping around", async () => {
    // Arrange
    render(<Controlled />);
    screen.getByRole("radio", { name: "Expense" }).focus();

    // Act
    await userEvent.keyboard("{ArrowRight}");
    const afterRight = (screen.getByRole("radio", { name: "Income" }) as HTMLInputElement).checked;
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");

    // Assert
    expect(afterRight).toBe(true);
    expect((screen.getByRole("radio", { name: "Transfer" }) as HTMLInputElement).checked).toBe(
      true,
    );
  });
});

describe("MovementRow", () => {
  it("shows title, caption, amount, tag and note", () => {
    // Arrange
    render(
      <MovementList>
        <MovementRow
          badge={<CategoryBadge name="Groceries" icon="shopping-cart" color={1} />}
          title="Coto"
          caption="Groceries · Visa"
          amount={<MoneyAmount amount={48300} currency="ARS" locale="es-AR" direction="expense" />}
          amountNote="not an expense"
          tag="1/3"
        />
      </MovementList>,
    );

    // Act
    const row = screen.getByRole("listitem");

    // Assert
    expect(row.textContent).toContain("Coto");
    expect(row.textContent).toContain("Groceries · Visa");
    expect(row.textContent).toContain("48.300");
    expect(row.textContent).toContain("1/3");
    expect(row.textContent).toContain("not an expense");
  });

  it("omits the optional parts", () => {
    // Arrange
    render(
      <MovementList>
        <MovementRow
          badge={<CategoryBadge name="Salary" color={2} />}
          title="Salary"
          caption="Galicia"
          amount="x"
        />
      </MovementList>,
    );

    // Act
    const row = screen.getByRole("listitem");

    // Assert
    expect(row.querySelector(".chip")).toBeNull();
    expect(row.querySelector(".movement-row__note")).toBeNull();
  });
});

describe("EmptyState", () => {
  it("renders title, description, icon and action", () => {
    // Arrange
    render(
      <EmptyState
        icon={<svg data-testid="icon" />}
        title="Nothing here"
        description="Add your first movement"
        action={<button type="button">Add</button>}
      />,
    );

    // Act
    const heading = screen.getByRole("heading", { name: "Nothing here" });

    // Assert
    expect(heading).toBeDefined();
    expect(screen.getByText("Add your first movement")).toBeDefined();
    expect(screen.getByTestId("icon")).toBeDefined();
    expect(screen.getByRole("button", { name: "Add" })).toBeDefined();
  });

  it("renders only the title when nothing else is given", () => {
    // Arrange
    const { container } = render(<EmptyState title="Empty" />);

    // Act
    const paragraphs = container.querySelectorAll("p");

    // Assert
    expect(paragraphs).toHaveLength(0);
  });
});
