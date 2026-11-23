import type { CategoryColor } from "../atoms/CategoryBadge";

export type PickerItem = {
  id: string;
  name: string;
  icon: string | null;
  color: CategoryColor;
};

export type PickerSection = { id: string; title: string | null; items: PickerItem[] };

export type CategorySelectorCopy = {
  title: string;
  searchLabel: string;
  placeholder: string;
  closeLabel: string;
  noResults: string;
  selectedLabel: string;
  addLabel: string;
};
