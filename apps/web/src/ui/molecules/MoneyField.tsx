import { useId } from "react";
import { MoneyInput, type MoneyInputProps } from "../atoms/MoneyInput";
import "../atoms/text-input.css";
import "./field.css";

type MoneyFieldProps = Omit<MoneyInputProps, "id"> & {
  label: string;
  error?: string | undefined;
};

export function MoneyField({ label, error, className, ...input }: MoneyFieldProps) {
  const inputId = useId();
  const errorId = useId();
  const classes = error ? "field field--invalid" : "field";
  return (
    <div className={classes}>
      <label className="field__caption" htmlFor={inputId}>
        {label}
      </label>
      <MoneyInput
        {...input}
        id={inputId}
        className={["text-input", className].filter(Boolean).join(" ")}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p id={errorId} className="field__error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
