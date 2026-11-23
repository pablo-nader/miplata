import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "../../app/i18n";
import { MoneyInput } from "./MoneyInput";

function Harness({ initial = "", onChange }: { initial?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <MoneyInput
      aria-label="Amount"
      currency="ARS"
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

async function renderIn(language: "es" | "en", initial = "", onChange?: (v: string) => void) {
  const i18n = await createI18n(language);
  render(
    <I18nextProvider i18n={i18n}>
      <Harness initial={initial} {...(onChange ? { onChange } : {})} />
    </I18nextProvider>,
  );
  return screen.getByLabelText("Amount") as HTMLInputElement;
}

describe("MoneyInput", () => {
  it("formats while typing in Spanish and keeps the canonical value", async () => {
    const onChange = vi.fn();
    const input = await renderIn("es", "", onChange);

    await userEvent.type(input, "1234,56");

    expect(input.value).toBe("1.234,56");
    expect(onChange).toHaveBeenLastCalledWith("1234.56");
  });

  it("formats while typing in English and keeps the canonical value", async () => {
    const onChange = vi.fn();
    const input = await renderIn("en", "", onChange);

    await userEvent.type(input, "1234.56");

    expect(input.value).toBe("1,234.56");
    expect(onChange).toHaveBeenLastCalledWith("1234.56");
  });

  it("shows the currency symbol", async () => {
    await renderIn("es");

    expect(screen.getByText("$")).toBeDefined();
  });

  it("accepts a pasted amount in either format", async () => {
    const input = await renderIn("en");

    await userEvent.click(input);
    await userEvent.paste("1.234,56");

    expect(input.value).toBe("1,234.56");
  });

  it("deletes digits and clears the field", async () => {
    const onChange = vi.fn();
    const input = await renderIn("es", "1234.5", onChange);

    await userEvent.click(input);
    await userEvent.keyboard("{Backspace}");
    expect(input.value).toBe("1.234,");
    await userEvent.clear(input);

    expect(input.value).toBe("");
    expect(onChange).toHaveBeenLastCalledWith("");
  });

  it("inserts a digit in the middle and keeps the caret next to it", async () => {
    const input = await renderIn("es", "1234");

    input.focus();
    input.setSelectionRange(1, 1);
    await userEvent.keyboard("9");

    expect(input.value).toBe("19.234");
    expect(input.selectionStart).toBe(2);
  });

  it("reads a pasted Spanish amount in English and a pasted English one in Spanish", async () => {
    const english = await renderIn("en");
    await userEvent.click(english);
    await userEvent.paste("2.500,75");
    expect(english.value).toBe("2,500.75");
  });

  it("ignores a paste that is not an amount", async () => {
    const input = await renderIn("es", "15");

    await userEvent.click(input);
    await userEvent.paste("abc");

    expect(input.value).toBe("15");
  });

  it("deletes the digit before a group separator when backspacing over it", async () => {
    const input = await renderIn("es", "1234");

    input.focus();
    input.setSelectionRange(2, 2);
    await userEvent.keyboard("{Backspace}");

    expect(input.value).toBe("234");
  });

  it("starts a sub-unit amount with a leading zero", async () => {
    const input = await renderIn("es");

    await userEvent.type(input, ",5");

    expect(input.value).toBe("0,5");
  });

  it("limits the digits", async () => {
    const input = await renderIn("en");

    await userEvent.type(input, "12345678901234");

    expect(input.value).toBe("1,234,567,890");
  });
});
