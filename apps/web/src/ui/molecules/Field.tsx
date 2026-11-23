import { type InputHTMLAttributes, type ReactNode, useId } from "react";
import { TextInput } from "../atoms/TextInput";
import "./field.css";

type FieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  label: string;
  error?: string;
};

export function Field({ label, error, ...input }: FieldProps) {
  const inputId = useId();
  const errorId = useId();
  const classes = error ? "field field--invalid" : "field";
  return (
    <div className={classes}>
      <label className="field__caption" htmlFor={inputId}>
        {label}
      </label>
      <TextInput
        {...input}
        id={inputId}
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

type FieldGroupProps = { label: string; children: ReactNode };

export function FieldGroup({ label, children }: FieldGroupProps) {
  return (
    <fieldset className="field-group">
      <legend className="visually-hidden">{label}</legend>
      {children}
    </fieldset>
  );
}
