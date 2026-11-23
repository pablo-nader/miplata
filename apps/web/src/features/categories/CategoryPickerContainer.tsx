import type { CategoryType } from "@miplata/shared";
import { useTranslation } from "react-i18next";
import { Button } from "../../ui/atoms/Button";
import { CategoryPicker } from "../../ui/molecules/CategoryPicker";
import { pickerSections, useLabel } from "./catalog";
import { useCategories } from "./useCategories";
import { useMostUsedCategories } from "./useMostUsedCategories";
import { usePickerCopy } from "./usePickerCopy";

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
  const copy = usePickerCopy();
  const { t } = useTranslation();
  const label = useLabel();
  const { state, reload } = useCategories();
  const mostUsed = useMostUsedCategories(type, !featuredIds);

  if (state.status === "loading" || (!featuredIds && mostUsed === undefined)) {
    return <p role="status">{t("categories.loading")}</p>;
  }
  if (state.status === "error") {
    return <Button onClick={reload}>{t("categories.retry")}</Button>;
  }
  return (
    <CategoryPicker
      label={copy.label}
      sections={pickerSections(state.catalog, type, label, value)}
      selectedId={value}
      onSelect={onChange}
      searchLabel={copy.searchLabel}
      emptyLabel={copy.emptyLabel}
      selector={copy.selector}
      locale={copy.locale}
      onAdd={copy.onAdd}
      featuredIds={featuredIds ?? mostUsed}
    />
  );
}
