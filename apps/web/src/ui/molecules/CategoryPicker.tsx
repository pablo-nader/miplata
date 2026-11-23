import { ChevronUp, Ellipsis } from "lucide-react";
import { CategoryBadge, type CategoryColor } from "../atoms/CategoryBadge";
import { SectionLabel } from "../atoms/SectionLabel";
import { BadgeChoice } from "./BadgeChoice";
import "./category-picker.css";
import { useState } from "react";

export type PickerItem = {
  id: string;
  name: string;
  icon: string | null;
  color: CategoryColor;
};

export type PickerSection = { id: string; title: string | null; items: PickerItem[] };

type CategoryPickerProps = {
  label: string;
  sections: readonly PickerSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  allLabel: string;
  fewerLabel: string;
  emptyLabel: string;
  featuredIds?: readonly string[];
  featuredCount?: number;
};

const defaultFeaturedCount = 4;

function featuredItems(
  all: readonly PickerItem[],
  selectedId: string | null,
  featuredIds: readonly string[] | undefined,
  count: number,
): PickerItem[] {
  const preferred = featuredIds
    ? featuredIds.flatMap((id) => all.filter((item) => item.id === id))
    : all;
  const chosen = preferred.slice(0, count);
  const selected = all.find((item) => item.id === selectedId);
  if (selected && !chosen.some((item) => item.id === selected.id)) {
    return [...chosen.slice(0, Math.max(count - 1, 0)), selected];
  }
  return chosen;
}

export function CategoryPicker({
  label,
  sections,
  selectedId,
  onSelect,
  allLabel,
  fewerLabel,
  emptyLabel,
  featuredIds,
  featuredCount = defaultFeaturedCount,
}: CategoryPickerProps) {
  const [expanded, setExpanded] = useState(false);
  const all = sections.flatMap((section) => section.items);

  function choice(item: PickerItem) {
    return (
      <BadgeChoice
        key={item.id}
        label={item.name}
        caption={item.name}
        selected={item.id === selectedId}
        onSelect={() => onSelect(item.id)}
        badge={
          <CategoryBadge
            name={item.name}
            icon={item.icon}
            color={item.color}
            size="picker"
            selected={item.id === selectedId}
          />
        }
      />
    );
  }

  if (all.length === 0) {
    return <p className="category-picker__empty">{emptyLabel}</p>;
  }

  return (
    <fieldset className="category-picker">
      <legend className="visually-hidden">{label}</legend>
      {expanded ? (
        <>
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.id} className="category-picker__section">
                {section.title ? <SectionLabel as="p">{section.title}</SectionLabel> : null}
                <div className="category-picker__grid">{section.items.map(choice)}</div>
              </div>
            ),
          )}
          <div className="category-picker__grid">
            <BadgeChoice
              label={fewerLabel}
              caption={fewerLabel}
              selected={false}
              expanded
              onSelect={() => setExpanded(false)}
              badge={
                <span className="category-picker__more">
                  <ChevronUp aria-hidden="true" strokeWidth={2} />
                </span>
              }
            />
          </div>
        </>
      ) : (
        <div className="category-picker__grid">
          {featuredItems(all, selectedId, featuredIds, featuredCount).map(choice)}
          <BadgeChoice
            label={allLabel}
            caption={allLabel}
            selected={false}
            expanded={false}
            onSelect={() => setExpanded(true)}
            badge={
              <span className="category-picker__more">
                <Ellipsis aria-hidden="true" strokeWidth={2} />
              </span>
            }
          />
        </div>
      )}
    </fieldset>
  );
}
