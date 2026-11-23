import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { CategorySelectorCopy } from "../../ui/molecules/category-picker-types";

export type PickerCopy = {
  label: string;
  searchLabel: string;
  emptyLabel: string;
  selector: CategorySelectorCopy;
  locale: string;
  onAdd: () => void;
};

export function usePickerCopy(): PickerCopy {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  return {
    label: t("categories.picker.label"),
    searchLabel: t("categories.picker.search"),
    emptyLabel: t("categories.picker.none"),
    locale: i18n.language,
    onAdd: () => navigate("/categories/new"),
    selector: {
      title: t("categories.picker.title"),
      searchLabel: t("categories.picker.searchField"),
      placeholder: t("categories.picker.placeholder"),
      closeLabel: t("categories.picker.close"),
      noResults: t("categories.picker.noResults"),
      selectedLabel: t("categories.picker.selected"),
      addLabel: t("categories.picker.add"),
    },
  };
}
