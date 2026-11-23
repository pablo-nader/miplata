import type { BudgetProgressDto, CategoriesResponse } from "@miplata/shared";
import type { useTranslation } from "react-i18next";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import type { BudgetRowData } from "./BudgetList";

type Translate = ReturnType<typeof useTranslation>["t"];
type Label = (item: { name: string | null; nameKey: string | null }) => string;

export function budgetTitle(
  budget: { categoryId: string | null; groupId: string | null },
  catalog: CategoriesResponse,
  label: Label,
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

export function toBudgetRow(
  budget: BudgetProgressDto,
  catalog: CategoriesResponse,
  label: Label,
  t: Translate,
  language: string,
): BudgetRowData {
  const locale = localeForLanguage(language);
  const title = budgetTitle(budget, catalog, label);
  return {
    id: budget.id,
    title,
    amounts: t("budgets.spentOf", {
      spent: formatMoney(budget.spentMinor / 100, budget.currency, locale),
      limit: formatMoney(budget.limitMinor / 100, budget.currency, locale),
    }),
    note: budgetNote(budget, t, language),
    spentMinor: budget.spentMinor,
    limitMinor: budget.limitMinor,
    progressLabel: t("budgets.progressLabel", { name: title }),
    to: `/budgets/${budget.id}/edit`,
  };
}
