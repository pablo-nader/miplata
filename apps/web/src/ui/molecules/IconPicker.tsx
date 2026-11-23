import { useId } from "react";
import { CategoryBadge, type CategoryColor } from "../atoms/CategoryBadge";
import { BadgeChoice } from "./BadgeChoice";
import "./category-picker.css";

export type IconOption = { name: string; label: string };

type IconPickerProps = {
  label: string;
  noIconLabel: string;
  options: readonly IconOption[];
  value: string | null;
  color: CategoryColor;
  fallbackName: string;
  onSelect: (icon: string | null) => void;
};

export function IconPicker({
  label,
  noIconLabel,
  options,
  value,
  color,
  fallbackName,
  onSelect,
}: IconPickerProps) {
  const legendId = useId();
  return (
    <fieldset className="category-picker" aria-labelledby={legendId}>
      <legend id={legendId} className="category-picker__legend">
        {label}
      </legend>
      <div className="category-picker__grid">
        <BadgeChoice
          label={noIconLabel}
          selected={value === null}
          onSelect={() => onSelect(null)}
          badge={
            <CategoryBadge
              name={fallbackName}
              icon={null}
              color={color}
              size="picker"
              selected={value === null}
            />
          }
        />
        {options.map((option) => (
          <BadgeChoice
            key={option.name}
            label={option.label}
            selected={value === option.name}
            onSelect={() => onSelect(option.name)}
            badge={
              <CategoryBadge
                name={option.label}
                icon={option.name}
                color={color}
                size="picker"
                selected={value === option.name}
              />
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
