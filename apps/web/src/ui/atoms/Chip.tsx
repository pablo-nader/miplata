import type { ReactNode } from "react";
import "./chip.css";

type ChipProps = { children: ReactNode };

export function Chip({ children }: ChipProps) {
  return <span className="chip">{children}</span>;
}

type FilterChipProps = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: ReactNode;
  ariaLabel?: string;
  expanded?: boolean;
};

export function FilterChip({
  label,
  selected = false,
  onClick,
  icon,
  ariaLabel,
  expanded,
}: FilterChipProps) {
  const classes = selected ? "filter-chip filter-chip--selected" : "filter-chip";
  return (
    <button
      type="button"
      className={classes}
      aria-pressed={expanded === undefined ? selected : undefined}
      aria-expanded={expanded}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
