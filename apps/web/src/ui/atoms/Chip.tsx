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
};

export function FilterChip({ label, selected = false, onClick, icon }: FilterChipProps) {
  const classes = selected ? "filter-chip filter-chip--selected" : "filter-chip";
  return (
    <button type="button" className={classes} aria-pressed={selected} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}
