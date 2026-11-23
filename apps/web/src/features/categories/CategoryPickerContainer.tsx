import type { CategoryType } from "@miplata/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/atoms/Button";
import { CategoryPicker } from "../../ui/molecules/CategoryPicker";
import { pickerSections, useLabel } from "./catalog";
import { useCategories } from "./useCategories";

type CategoryPickerContainerProps = {
  type: CategoryType;
  value: string | null;
  onChange: (categoryId: string) => void;
  featuredIds?: readonly string[];
};

export function CategoryPickerContainer({
  type,
  value,
  onChange,
  featuredIds,
}: CategoryPickerContainerProps) {
  const { t } = useTranslation();
  const label = useLabel();
  const { state, reload } = useCategories();

  if (state.status === "loading") {
    return <p role="status">{t("categories.loading")}</p>;
  }
  if (state.status === "error") {
    return <Button onClick={reload}>{t("categories.retry")}</Button>;
  }
  return (
    <CategoryPicker
      label={t("categories.picker.label")}
      sections={pickerSections(state.catalog, type, label)}
      selectedId={value}
      onSelect={onChange}
      allLabel={t("categories.picker.all")}
      fewerLabel={t("categories.picker.fewer")}
      emptyLabel={t("categories.picker.none")}
      {...(featuredIds ? { featuredIds } : {})}
    />
  );
}
