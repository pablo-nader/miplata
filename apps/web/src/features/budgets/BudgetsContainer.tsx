import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { useLabel } from "../categories/catalog";
import { useCategories } from "../categories/useCategories";
import type { BudgetRowData } from "./BudgetList";
import { BudgetsScreen } from "./BudgetsScreen";
import { toBudgetRow } from "./budget-rows";
import { fetchBudgets } from "./budgets-api";
import { currentMonth } from "./current-month";

export function BudgetsContainer() {
  const { t, i18n } = useTranslation();
  const label = useLabel();
  const month = currentMonth();
  const load = useCallback(() => fetchBudgets(month), [month]);
  const budgets = useResource(load);
  const categories = useCategories();

  const status =
    budgets.state.status === "error" || categories.state.status === "error"
      ? "error"
      : budgets.state.status === "ready" && categories.state.status === "ready"
        ? "ready"
        : "loading";

  const catalog = categories.state.status === "ready" ? categories.state.catalog : null;
  const rows: BudgetRowData[] =
    budgets.state.status === "ready" && catalog
      ? budgets.state.data.items.map((budget) =>
          toBudgetRow(budget, catalog, label, t, i18n.language),
        )
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
