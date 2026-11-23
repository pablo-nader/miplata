import { ChevronDown } from "lucide-react";
import { type SelectHTMLAttributes, useId } from "react";
import "./select-field.css";

export type SelectOption = { value: string; label: string };
export type SelectGroup = { label: string; options: readonly SelectOption[] };

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "onChange"> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options?: readonly SelectOption[];
  groups?: readonly SelectGroup[];
  error?: string | undefined;
};

export function SelectField({
  label,
  value,
  onChange,
  options = [],
  groups = [],
  error,
  ...rest
}: SelectFieldProps) {
  const selectId = useId();
  const errorId = useId();
  const classes = error ? "select-field select-field--invalid" : "select-field";
  return (
    <div className={classes}>
      <label className="select-field__caption" htmlFor={selectId}>
        {label}
      </label>
      <div className="select-field__control">
        <select
          {...rest}
          id={selectId}
          className="select-field__select"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown aria-hidden="true" />
      </div>
      {error ? (
        <p id={errorId} className="select-field__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
