import { Check, Plus, Search, X } from "lucide-react";
import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { CategoryBadge } from "../atoms/CategoryBadge";
import { SectionLabel } from "../atoms/SectionLabel";
import type { CategorySelectorCopy, PickerItem, PickerSection } from "./category-picker-types";
import { filterSections } from "./category-search";
import "./category-selector.css";

type CategorySelectorProps = {
  copy: CategorySelectorCopy;
  sections: readonly PickerSection[];
  selectedId: string | null;
  locale?: string | undefined;
  onSelect: (id: string) => void;
  onClose: () => void;
  onAdd?: (() => void) | undefined;
};

const FOCUSABLE = "button:not([disabled]), input:not([disabled])";
const ARROWS = ["ArrowDown", "ArrowUp"];

export function CategorySelector({
  copy,
  sections,
  selectedId,
  locale,
  onSelect,
  onClose,
  onAdd,
}: CategorySelectorProps) {
  const [query, setQuery] = useState("");
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const results = useMemo(() => filterSections(sections, query, locale), [sections, query, locale]);

  useEffect(() => {
    input.current?.focus();
  }, []);

  useEffect(() => {
    const element = panel.current;
    if (!element) {
      return;
    }
    const container: HTMLElement = element;
    function handle(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (event.key === "Tab") {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const inside = active instanceof Node && container.contains(active);
        if (!inside) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        } else if (event.shiftKey && active === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && active === last) {
          event.preventDefault();
          first?.focus();
        }
        return;
      }
      if (!ARROWS.includes(event.key)) {
        return;
      }
      const stops = focusable.filter((node) => node.dataset.stop !== undefined);
      const index = stops.indexOf(document.activeElement as HTMLElement);
      const target = stops[index + (event.key === "ArrowDown" ? 1 : -1)];
      if (target) {
        event.preventDefault();
        target.focus();
      }
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  function handleSearchKey(event: KeyboardEvent<HTMLInputElement>) {
    const first = results[0]?.items[0];
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (first && query.trim() !== "") {
        onSelect(first.id);
      }
    }
  }

  function option(item: PickerItem) {
    const selected = item.id === selectedId;
    return (
      <button
        key={item.id}
        type="button"
        role="option"
        data-stop=""
        aria-selected={selected}
        className="category-selector__option"
        onClick={() => onSelect(item.id)}
      >
        <CategoryBadge name={item.name} icon={item.icon} color={item.color} selected={selected} />
        <span className="category-selector__name">{item.name}</span>
        {selected ? <Check aria-hidden="true" strokeWidth={2.5} /> : null}
      </button>
    );
  }

  return (
    <div className="category-selector">
      <div
        ref={panel}
        className="category-selector__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="category-selector__header">
          <h2 id={titleId} className="category-selector__title">
            {copy.title}
          </h2>
          <button
            type="button"
            className="category-selector__close"
            aria-label={copy.closeLabel}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="category-selector__search">
          <Search aria-hidden="true" />
          <input
            ref={input}
            type="search"
            className="category-selector__input"
            aria-label={copy.searchLabel}
            placeholder={copy.placeholder}
            autoComplete="off"
            value={query}
            data-stop=""
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleSearchKey}
          />
        </div>
        <div className="category-selector__results">
          {results.length === 0 ? (
            <p className="category-selector__none" role="status">
              {copy.noResults}
            </p>
          ) : (
            <div role="listbox" aria-label={copy.title}>
              {results.map((section) => (
                <fieldset key={section.id} className="category-selector__group">
                  <legend className="visually-hidden">{section.title ?? copy.title}</legend>
                  {section.title ? <SectionLabel as="p">{section.title}</SectionLabel> : null}
                  {section.items.map(option)}
                </fieldset>
              ))}
            </div>
          )}
        </div>
        {onAdd ? (
          <button type="button" data-stop="" className="category-selector__add" onClick={onAdd}>
            <Plus aria-hidden="true" strokeWidth={2.5} />
            {copy.addLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
