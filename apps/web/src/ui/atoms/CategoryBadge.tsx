import { Plus } from "lucide-react";
import { resolveCategoryIcon } from "../icons/category-icons";
import "./category-badge.css";

export type CategoryColor = 1 | 2 | 3 | 4 | 5;
export type BadgeSize = "list" | "picker";

const colorCount = 5;

export function categoryColorFor(index: number): CategoryColor {
  const position = ((Math.trunc(index) % colorCount) + colorCount) % colorCount;
  return (position + 1) as CategoryColor;
}

export function firstLetter(name: string): string {
  const [first] = Array.from(name.trim());
  return first ? first.toLocaleUpperCase() : "?";
}

type CategoryBadgeProps = {
  name: string;
  icon?: string | null;
  color: CategoryColor;
  size?: BadgeSize;
  selected?: boolean;
  standalone?: boolean;
};

export function CategoryBadge({
  name,
  icon,
  color,
  size = "list",
  selected = false,
  standalone = false,
}: CategoryBadgeProps) {
  const Icon = resolveCategoryIcon(icon);
  const classes = [
    "category-badge",
    `category-badge--${size}`,
    `category-badge--color-${color}`,
    selected ? "category-badge--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const accessibility = standalone
    ? ({ role: "img", "aria-label": name } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span className={classes} {...accessibility}>
      {Icon ? (
        <Icon aria-hidden="true" strokeWidth={2} />
      ) : (
        <span className="category-badge__letter" aria-hidden="true">
          {firstLetter(name)}
        </span>
      )}
    </span>
  );
}

type AddCategoryBadgeProps = { size?: BadgeSize };

export function AddCategoryBadge({ size = "list" }: AddCategoryBadgeProps) {
  return (
    <span
      className={`category-badge category-badge--${size} category-badge--add`}
      aria-hidden="true"
    >
      <Plus aria-hidden="true" strokeWidth={2} />
    </span>
  );
}
