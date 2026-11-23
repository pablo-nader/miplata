import { useId } from "react";
import "./segmented-control.css";

export type SegmentOption = { value: string; label: string };

type SegmentedControlProps = {
  label: string;
  options: readonly SegmentOption[];
  value: string;
  onChange: (value: string) => void;
};

export function SegmentedControl({ label, options, value, onChange }: SegmentedControlProps) {
  const name = useId();
  return (
    <fieldset className="segmented-control">
      <legend className="visually-hidden">{label}</legend>
      {options.map((option) => (
        <label key={option.value} className="segmented-control__segment">
          <input
            className="visually-hidden"
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className="segmented-control__text">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
