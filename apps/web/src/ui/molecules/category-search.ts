export type SearchableItem = { name: string };
export type SearchableSection<Item extends SearchableItem> = {
  id: string;
  title: string | null;
  items: Item[];
};

const COMBINING_MARKS = /\p{M}/gu;

export function normalizeText(value: string, locale?: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLocaleLowerCase(locale).trim();
}

export function filterSections<
  Item extends SearchableItem,
  Section extends SearchableSection<Item>,
>(sections: readonly Section[], query: string, locale?: string): Section[] {
  const needle = normalizeText(query, locale);
  if (needle === "") {
    return sections.filter((section) => section.items.length > 0);
  }
  const matches = (text: string) => normalizeText(text, locale).includes(needle);
  return sections.flatMap((section) => {
    const items =
      section.title !== null && matches(section.title)
        ? section.items
        : section.items.filter((item) => matches(item.name));
    return items.length === 0 ? [] : [{ ...section, items }];
  });
}

export function featuredItems<Item extends { id: string }>(
  all: readonly Item[],
  selectedId: string | null,
  preferredIds: readonly string[] | undefined,
  count: number,
): Item[] {
  const chosen: Item[] = [];
  for (const id of preferredIds ?? []) {
    const found = all.find((item) => item.id === id);
    if (found && !chosen.includes(found) && chosen.length < count) {
      chosen.push(found);
    }
  }
  for (const item of all) {
    if (chosen.length >= count) {
      break;
    }
    if (!chosen.includes(item)) {
      chosen.push(item);
    }
  }
  const selected = all.find((item) => item.id === selectedId);
  if (selected && !chosen.includes(selected)) {
    return [...chosen.slice(0, Math.max(count - 1, 0)), selected];
  }
  return chosen;
}
