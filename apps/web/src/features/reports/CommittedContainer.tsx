import { COMMITTED_MONTHS_DEFAULT } from "@miplata/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney } from "../../ui/format/money";
import { minorToUnits } from "../accounts/account-display";
import { CommittedPanel, type CommittedRowData } from "./CommittedPanel";
import type { PanelContainerProps } from "./panel-props";
import { formatMonthLabel, shiftMonth } from "./report-view";
import { fetchCommitted } from "./reports-api";

export function CommittedContainer({ month, filters, locale, messages }: PanelContainerProps) {
  const { t } = useTranslation();
  const { currency, accountId, categoryId } = filters;
  const from = shiftMonth(month, 1);
  const load = useCallback(
    () => fetchCommitted(from, COMMITTED_MONTHS_DEFAULT, { currency, accountId, categoryId }),
    [from, currency, accountId, categoryId],
  );
  const { state, reload } = useResource(load);
  const money = (minor: number) => formatMoney(minorToUnits(minor), currency, locale);

  const rows: CommittedRowData[] =
    state.status === "ready"
      ? state.data.months.map((item) => ({
          key: item.month,
          label: formatMonthLabel(item.month, locale),
          total: money(item.totalMinor),
          isEmpty: item.totalMinor === 0,
          parts: [
            ...(item.installmentsMinor > 0
              ? [t("reports.committed.installments", { amount: money(item.installmentsMinor) })]
              : []),
            ...(item.recurringMinor > 0
              ? [t("reports.committed.recurring", { amount: money(item.recurringMinor) })]
              : []),
          ],
        }))
      : [];

  return (
    <CommittedPanel
      status={state.status}
      messages={messages}
      rows={rows}
      note={t("reports.committed.note")}
      onRetry={reload}
    />
  );
}
