import type { ReactNode } from "react";
import "./badge-choice.css";

type BadgeChoiceProps = {
  label: string;
  selected: boolean;
  onSelect: () => void;
  badge: ReactNode;
  caption?: string;
  expanded?: boolean;
};

export function BadgeChoice({
  label,
  selected,
  onSelect,
  badge,
  caption,
  expanded,
}: BadgeChoiceProps) {
  return (
    <button
      type="button"
      className="badge-choice"
      aria-pressed={expanded === undefined ? selected : undefined}
      aria-expanded={expanded}
      aria-label={caption ? undefined : label}
      onClick={onSelect}
    >
      {badge}
      {caption ? <span className="badge-choice__caption">{caption}</span> : null}
    </button>
  );
}
