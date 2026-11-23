import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney } from "../../ui/format/money";
import { minorToUnits } from "../accounts/account-display";
import { MonthlyPanel, type MonthlyRowData } from "./MonthlyPanel";
import type { PanelContainerProps } from "./panel-props";
import { formatMonthLabel, formatShortMonth } from "./report-view";
import { fetchMonthly } from "./reports-api";

export function MonthlyContainer({ month, filters, locale, messages }: PanelContainerProps) {
  const { t } = useTranslation();
  const { currency, accountId, categoryId } = filters;
  const load = useCallback(
    () => fetchMonthly(month, { currency, accountId, categoryId }),
    [month, currency, accountId, categoryId],
  );
  const { state, reload } = useResource(load);
  const money = (minor: number, direction: "income" | "neutral" = "neutral") =>
    formatMoney(minorToUnits(minor), currency, locale, direction);

  const rows: MonthlyRowData[] =
    state.status === "ready"
      ? state.data.months.map((item) => ({
          month: item.month,
          shortLabel: formatShortMonth(item.month, locale),
          fullLabel: formatMonthLabel(item.month, locale),
          inMinor: item.inMinor,
          outMinor: item.outMinor,
          resultMinor: item.resultMinor,
          inText: money(item.inMinor),
          outText: money(item.outMinor),
          resultText: money(item.resultMinor, item.resultMinor > 0 ? "income" : "neutral"),
        }))
      : [];

  return (
    <MonthlyPanel
      status={state.status}
      messages={messages}
      rows={rows}
      labels={{
        chart: t("reports.monthly.chart"),
        inLabel: t("reports.monthly.in"),
        outLabel: t("reports.monthly.out"),
        resultLabel: t("reports.monthly.result"),
        monthLabel: t("reports.monthly.month"),
        table: t("reports.monthly.table"),
      }}
      onRetry={reload}
    />
  );
}
