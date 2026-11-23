import type { CategoriesResponse, CategoryDto } from "@miplata/shared";
import { categoryLabel } from "@miplata/shared";
import { useTranslation } from "react-i18next";
import { categoryColorFor } from "../../ui/atoms/CategoryBadge";
import type { PickerSection } from "../../ui/molecules/CategoryPicker";

export function allCategories(catalog: CategoriesResponse): CategoryDto[] {
  return [...catalog.expenseGroups.flatMap((group) => group.categories), ...catalog.income];
}

export function findCategory(catalog: CategoriesResponse, id: string): CategoryDto | null {
  return allCategories(catalog).find((item) => item.id === id) ?? null;
}

export function colorOf(category: { color: number }) {
  return categoryColorFor(category.color - 1);
}

export function useLabel() {
  const { t } = useTranslation();
  return (item: { name: string | null; nameKey: string | null }) =>
    categoryLabel(item, (key) => t(key));
}

export function pickerSections(
  catalog: CategoriesResponse,
  type: "expense" | "income",
  label: (item: { name: string | null; nameKey: string | null }) => string,
  selectedId: string | null = null,
): PickerSection[] {
  const offered = (item: CategoryDto) => item.isActive || item.id === selectedId;
  const toItem = (item: CategoryDto) => ({
    id: item.id,
    name: label(item),
    icon: item.icon,
    color: colorOf(item),
  });
  if (type === "income") {
    return [{ id: "income", title: null, items: catalog.income.filter(offered).map(toItem) }];
  }
  return catalog.expenseGroups.map((group) => ({
    id: group.id,
    title: label(group),
    items: group.categories.filter(offered).map(toItem),
  }));
}
