import { type CategoriesResponse, categoryLabel } from "@miplata/shared";
import type { TFunction } from "i18next";
import { type CategoryColor, categoryColorFor } from "../../ui/atoms/CategoryBadge";
import type { SelectGroup } from "./ReportsScreen";

export type CategoryInfo = { name: string; icon: string | null; color: CategoryColor };
export type GroupInfo = { name: string; color: CategoryColor };

export type CatalogLookup = {
  category(id: string): CategoryInfo;
  group(id: string | null): GroupInfo;
  selectGroups(): SelectGroup[];
};

const FALLBACK_COLOR: CategoryColor = 5;

export function createLookup(catalog: CategoriesResponse | null, t: TFunction): CatalogLookup {
  const label = (item: { name: string | null; nameKey: string | null }) =>
    categoryLabel(item, (key) => t(key));
  const groups = catalog?.expenseGroups ?? [];
  const categories = [...groups.flatMap((group) => group.categories), ...(catalog?.income ?? [])];
  return {
    category(id) {
      const found = categories.find((item) => item.id === id);
      return found
        ? {
            name: label(found),
            icon: found.icon,
            color: categoryColorFor(found.color - 1),
          }
        : { name: t("reports.unknownCategory"), icon: null, color: FALLBACK_COLOR };
    },
    group(id) {
      const index = groups.findIndex((item) => item.id === id);
      const found = groups[index];
      return found
        ? { name: label(found), color: categoryColorFor(index) }
        : { name: t("reports.ungrouped"), color: FALLBACK_COLOR };
    },
    selectGroups() {
      const expense = groups.map((group) => ({
        label: label(group),
        options: group.categories.map((item) => ({ value: item.id, label: label(item) })),
      }));
      const income = {
        label: t("reports.incomeGroup"),
        options: (catalog?.income ?? []).map((item) => ({ value: item.id, label: label(item) })),
      };
      return [...expense, income].filter((group) => group.options.length > 0);
    },
  };
}
