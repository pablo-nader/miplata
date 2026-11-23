import { useId } from "react";
import { CategoryBadge, type CategoryColor } from "../atoms/CategoryBadge";
import { BadgeChoice } from "./BadgeChoice";
import "./category-picker.css";

export type ColorOption = { value: CategoryColor; label: string };

type ColorPickerProps = {
  label: string;
  options: readonly ColorOption[];
  value: CategoryColor;
  swatchName: string;
  onSelect: (color: CategoryColor) => void;
};

export function ColorPicker({ label, options, value, swatchName, onSelect }: ColorPickerProps) {
  const legendId = useId();
  return (
    <fieldset className="category-picker" aria-labelledby={legendId}>
      <legend id={legendId} className="category-picker__legend">
        {label}
      </legend>
      <div className="category-picker__grid">
        {options.map((option) => (
          <BadgeChoice
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onSelect={() => onSelect(option.value)}
            badge={
              <CategoryBadge
                name={swatchName}
                icon={null}
                color={option.value}
                size="picker"
                selected={value === option.value}
              />
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
