import { Search } from "lucide-react";
import { useRef, useState } from "react";
import { CategoryBadge } from "../atoms/CategoryBadge";
import { BadgeChoice } from "./BadgeChoice";
import { CategorySelector } from "./CategorySelector";
import type { CategorySelectorCopy, PickerItem, PickerSection } from "./category-picker-types";
import { featuredItems } from "./category-search";
import "./category-picker.css";

export type { CategorySelectorCopy, PickerItem, PickerSection };

type CategoryPickerProps = {
  label: string;
  sections: readonly PickerSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchLabel: string;
  emptyLabel: string;
  selector: CategorySelectorCopy;
  locale?: string | undefined;
  onAdd?: (() => void) | undefined;
  featuredIds?: readonly string[] | undefined;
  featuredCount?: number;
};

const defaultFeaturedCount = 4;

export function CategoryPicker({
  label,
  sections,
  selectedId,
  onSelect,
  searchLabel,
  emptyLabel,
  selector,
  locale,
  onAdd,
  featuredIds,
  featuredCount = defaultFeaturedCount,
}: CategoryPickerProps) {
  const [searching, setSearching] = useState(false);
  const container = useRef<HTMLFieldSetElement>(null);

  function close() {
    setSearching(false);
    setTimeout(() => {
      container.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
    }, 0);
  }

  const all = sections.flatMap((section) => section.items);

  if (all.length === 0) {
    return <p className="category-picker__empty">{emptyLabel}</p>;
  }

  return (
    <fieldset ref={container} className="category-picker">
      <legend className="visually-hidden">{label}</legend>
      <div className="category-picker__grid">
        {featuredItems(all, selectedId, featuredIds, featuredCount).map((item) => (
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
        ))}
        <BadgeChoice
          label={searchLabel}
          caption={searchLabel}
          selected={false}
          expanded={searching}
          opensDialog
          onSelect={() => setSearching(true)}
          badge={
            <span className="category-picker__more">
              <Search aria-hidden="true" strokeWidth={2} />
            </span>
          }
        />
      </div>
      {searching ? (
        <CategorySelector
          copy={selector}
          sections={sections}
          selectedId={selectedId}
          locale={locale}
          onAdd={onAdd}
          onClose={close}
          onSelect={(id) => {
            onSelect(id);
            close();
          }}
        />
      ) : null}
    </fieldset>
  );
}
