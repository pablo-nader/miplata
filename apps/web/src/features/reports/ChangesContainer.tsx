import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney } from "../../ui/format/money";
import { minorToUnits } from "../accounts/account-display";
import { type ChangeRowData, ChangesPanel } from "./ChangesPanel";
import type { PanelContainerProps } from "./panel-props";
import { formatPercentChange } from "./report-view";
import { fetchChanges } from "./reports-api";

export function ChangesContainer({
  month,
  filters,
  lookup,
  locale,
  messages,
}: PanelContainerProps) {
  const { t } = useTranslation();
  const { currency, accountId, categoryId } = filters;
  const load = useCallback(
    () => fetchChanges(month, { currency, accountId, categoryId }),
    [month, currency, accountId, categoryId],
  );
  const { state, reload } = useResource(load);

  const rows: ChangeRowData[] =
    state.status === "ready"
      ? state.data.categories.map((item) => {
          const info = lookup.category(item.categoryId);
          return {
            key: item.categoryId,
            name: info.name,
            icon: info.icon,
            color: info.color,
            amount: {
              amount: minorToUnits(item.currentMinor),
              currency,
              locale,
              direction: "expense",
            },
            caption: t("reports.changes.average", {
              amount: formatMoney(minorToUnits(item.previousAverageMinor), currency, locale),
            }),
            percentText:
              item.percentChange === null
                ? t("reports.changes.noBaseline")
                : t("reports.changes.versus", {
                    percent: formatPercentChange(item.percentChange, locale),
                  }),
          };
        })
      : [];

  return (
    <ChangesPanel
      status={state.status}
      messages={messages}
      rows={rows}
      note={t("reports.changes.nominalNote")}
      onRetry={reload}
    />
  );
}
