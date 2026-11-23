import type { BudgetProgressDto, CategoriesResponse } from "@miplata/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { useLabel } from "../categories/catalog";
import { useCategories } from "../categories/useCategories";
import { type BudgetRowData, BudgetsScreen } from "./BudgetsScreen";
import { fetchBudgets } from "./budgets-api";
import { currentMonth } from "./current-month";

type Translate = ReturnType<typeof useTranslation>["t"];

export function budgetTitle(
  budget: { categoryId: string | null; groupId: string | null },
  catalog: CategoriesResponse,
  label: (item: { name: string | null; nameKey: string | null }) => string,
): string {
  if (budget.groupId) {
    const group = catalog.expenseGroups.find((item) => item.id === budget.groupId);
    return group ? label(group) : "";
  }
  const category = catalog.expenseGroups
    .flatMap((group) => group.categories)
    .find((item) => item.id === budget.categoryId);
  return category ? label(category) : "";
}

export function budgetNote(budget: BudgetProgressDto, t: Translate, language: string): string {
  const locale = localeForLanguage(language);
  const amount = (minor: number) => formatMoney(minor / 100, budget.currency, locale);
  if (budget.state === "reached") {
    return budget.overspentMinor > 0
      ? t("budgets.over", { amount: amount(budget.overspentMinor) })
      : t("budgets.reached");
  }
  const key = budget.state === "warning" ? "budgets.near" : "budgets.left";
  return t(key, { amount: amount(budget.remainingMinor) });
}

export function BudgetsContainer() {
  const { t, i18n } = useTranslation();
  const label = useLabel();
  const month = currentMonth();
  const load = useCallback(() => fetchBudgets(month), [month]);
  const budgets = useResource(load);
  const categories = useCategories();
  const locale = localeForLanguage(i18n.language);

  const status =
    budgets.state.status === "error" || categories.state.status === "error"
      ? "error"
      : budgets.state.status === "ready" && categories.state.status === "ready"
        ? "ready"
        : "loading";

  const catalog = categories.state.status === "ready" ? categories.state.catalog : null;
  const rows: BudgetRowData[] =
    budgets.state.status === "ready" && catalog
      ? budgets.state.data.items.map((budget) => {
          const title = budgetTitle(budget, catalog, label);
          return {
            id: budget.id,
            title,
            amounts: t("budgets.spentOf", {
              spent: formatMoney(budget.spentMinor / 100, budget.currency, locale),
              limit: formatMoney(budget.limitMinor / 100, budget.currency, locale),
            }),
            note: budgetNote(budget, t, i18n.language),
            spentMinor: budget.spentMinor,
            limitMinor: budget.limitMinor,
            progressLabel: t("budgets.progressLabel", { name: title }),
            to: `/budgets/${budget.id}/edit`,
          };
        })
      : [];

  function retry() {
    budgets.reload();
    categories.reload();
  }

  return (
    <BudgetsScreen
      title={t("screens.budgets.title")}
      back={{ to: "/menu", label: t("budgets.back") }}
      add={{ to: "/budgets/new", label: t("budgets.add") }}
      status={status}
      rows={rows}
      messages={{
        loading: t("budgets.loading"),
        loadFailed: t("budgets.loadFailed"),
        retry: t("budgets.retry"),
        emptyTitle: t("budgets.emptyTitle"),
        emptyDescription: t("budgets.emptyDescription"),
      }}
      onRetry={retry}
    />
  );
}
