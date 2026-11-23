import {
  type ChangeEvent,
  type ClipboardEvent,
  type InputHTMLAttributes,
  useLayoutEffect,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { type Currency, localeForLanguage } from "../format/money";
import {
  caretAfter,
  currencySymbol,
  formatCanonical,
  interpretTyping,
  parseLocalized,
} from "../format/money-input";
import "./money-input.css";

export type MoneyInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
> & {
  value: string;
  currency: Currency;
  onValueChange: (canonical: string) => void;
  allowNegative?: boolean;
};

export function MoneyInput({
  value,
  currency,
  onValueChange,
  allowNegative = false,
  className,
  placeholder = "0",
  ...rest
}: MoneyInputProps) {
  const { i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);
  const display = formatCanonical(value, locale);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && pendingCaret.current !== null && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const next = interpretTyping(raw, caret, locale, allowNegative);
    pendingCaret.current = caretAfter(
      formatCanonical(next.canonical, locale),
      next.significantBefore,
      locale,
    );
    onValueChange(next.canonical);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const canonical = parseLocalized(event.clipboardData.getData("text"), allowNegative);
    pendingCaret.current = formatCanonical(canonical, locale).length;
    onValueChange(canonical);
  }

  return (
    <span className="money-input">
      <span className="money-input__symbol" aria-hidden="true">
        {currencySymbol(currency)}
      </span>
      <input
        {...rest}
        ref={inputRef}
        className={["money-input__field", className].filter(Boolean).join(" ")}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        value={display}
        onChange={handleChange}
        onPaste={handlePaste}
      />
    </span>
  );
}
