import {
  type ChangeEvent,
  type ClipboardEvent,
  type InputHTMLAttributes,
  useLayoutEffect,
  useReducer,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { type Currency, currencySymbol, localeForLanguage } from "../format/money";
import {
  caretAfter,
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
  const [, refresh] = useReducer((tick: number) => tick + 1, 0);
  const display = formatCanonical(value, locale);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input && pendingCaret.current !== null && document.activeElement === input) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
    }
    pendingCaret.current = null;
  });

  function apply(raw: string, caret: number): boolean {
    const next = interpretTyping(raw, caret, locale, allowNegative);
    if (next.truncated) {
      pendingCaret.current = Math.max(caret - 1, 0);
      refresh();
      return false;
    }
    pendingCaret.current = caretAfter(
      formatCanonical(next.canonical, locale),
      next.significantBefore,
      locale,
    );
    if (next.canonical === value) {
      refresh();
      return true;
    }
    onValueChange(next.canonical);
    return true;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const caret = event.target.selectionStart ?? raw.length;
    const backspace =
      (event.nativeEvent as InputEvent).inputType === "deleteContentBackward" &&
      raw.length === display.length - 1;
    const sameValue = interpretTyping(raw, caret, locale, allowNegative).canonical === value;
    if (backspace && sameValue && caret > 0) {
      apply(raw.slice(0, caret - 1) + raw.slice(caret), caret - 1);
      return;
    }
    apply(raw, caret);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = parseLocalized(event.clipboardData.getData("text"), allowNegative);
    if (pasted === "" || pasted === "-") {
      return;
    }
    const start = event.currentTarget.selectionStart ?? display.length;
    const end = event.currentTarget.selectionEnd ?? display.length;
    const inserted = formatCanonical(pasted, locale);
    apply(display.slice(0, start) + inserted + display.slice(end), start + inserted.length);
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
