import type { CategoryDto } from "@miplata/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CategoriesScreen, type CategoryRowView } from "./CategoriesScreen";
import { colorOf, useLabel } from "./catalog";
import { useCategories } from "./useCategories";

export function CategoriesContainer() {
  const { t } = useTranslation();
  const label = useLabel();
  const { state, reload } = useCategories();
  const [tab, setTab] = useState<"expense" | "income">("expense");

  const row = (item: CategoryDto): CategoryRowView => ({
    id: item.id,
    name: label(item),
    icon: item.icon,
    color: colorOf(item),
    to: `/categories/${item.id}`,
    inactive: !item.isActive,
  });

  const body = (() => {
    if (state.status === "loading") {
      return { status: "loading", message: t("categories.loading") } as const;
    }
    if (state.status === "error") {
      return {
        status: "error",
        message: t("categories.loadFailed"),
        retry: { label: t("categories.retry"), onClick: reload },
      } as const;
    }
    const { catalog } = state;
    const sections =
      tab === "expense"
        ? catalog.expenseGroups.map((group) => ({
            id: group.id,
            title: label(group),
            edit: {
              to: `/categories/groups/${group.id}`,
              label: t("categories.editGroup", { name: label(group) }),
            },
            rows: group.categories.map(row),
            add: { to: `/categories/new?group=${group.id}`, label: t("categories.addCategory") },
          }))
        : [
            {
              id: "income",
              title: null,
              edit: null,
              rows: catalog.income.map(row),
              add: { to: "/categories/new?type=income", label: t("categories.addCategory") },
            },
          ];
    return {
      status: "ready",
      sections,
      inactiveLabel: t("categories.inactive"),
      emptyLabel: t("categories.emptyGroup"),
      addGroup:
        tab === "expense"
          ? { to: "/categories/groups/new", label: t("categories.addGroup") }
          : null,
    } as const;
  })();

  return (
    <CategoriesScreen
      title={t("categories.title")}
      back={{ to: "/menu", label: t("nav.menu") }}
      tabs={{
        label: t("categories.tabs.label"),
        options: [
          { value: "expense", label: t("categories.tabs.expense") },
          { value: "income", label: t("categories.tabs.income") },
        ],
        value: tab,
        onChange: (value) => setTab(value === "income" ? "income" : "expense"),
      }}
      body={body}
    />
  );
}
