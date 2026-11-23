import type { SpendingMovements } from "@miplata/shared";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney } from "../../ui/format/money";
import { minorToUnits } from "../accounts/account-display";
import type { PanelContainerProps } from "./panel-props";
import { barPercent, formatShare } from "./report-view";
import { fetchSpending, fetchSpendingMovements } from "./reports-api";
import { type BarRowData, type SpendingMovementRowData, SpendingPanel } from "./SpendingPanel";

type Selection = { groupId: string | null; categoryId: string | null } | null;

type MovementsState = { forCategory: string | null; result: SpendingMovements };

const NO_MOVEMENTS: SpendingMovements = { items: [] };

function shortDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function SpendingContainer({
  month,
  filters,
  lookup,
  locale,
  messages,
}: PanelContainerProps) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<Selection>(null);
  const { currency, accountId, categoryId } = filters;

  const loadReport = useCallback(
    () => fetchSpending(month, { currency, accountId, categoryId }),
    [month, currency, accountId, categoryId],
  );
  const { state, reload } = useResource(loadReport);

  const drilledCategory = selection?.categoryId ?? null;
  const loadMovements = useCallback(
    (): Promise<MovementsState> =>
      drilledCategory
        ? fetchSpendingMovements(month, { currency, accountId, categoryId }, drilledCategory).then(
            (result) => ({ forCategory: drilledCategory, result }),
          )
        : Promise.resolve({ forCategory: null, result: NO_MOVEMENTS }),
    [month, currency, accountId, categoryId, drilledCategory],
  );
  const movementsResource = useResource(loadMovements);

  const report = state.status === "ready" ? state.data : null;
  const money = (minor: number) => formatMoney(minorToUnits(minor), currency, locale);
  const group = report?.groups.find((item) => item.groupId === selection?.groupId);

  const source = selection && group ? group.categories : (report?.groups ?? []);
  const max = source.reduce((top, item) => Math.max(top, item.totalMinor), 0);
  const rows: BarRowData[] = source.map((item) => {
    const isCategory = "categoryId" in item;
    const info = isCategory ? lookup.category(item.categoryId) : lookup.group(item.groupId);
    return {
      key: isCategory ? item.categoryId : (item.groupId ?? "none"),
      name: info.name,
      color: info.color,
      amount: money(item.totalMinor),
      share: formatShare(item.sharePercent, locale),
      percent: barPercent(item.totalMinor, max),
      onSelect: () =>
        setSelection(
          isCategory
            ? { groupId: selection?.groupId ?? null, categoryId: item.categoryId }
            : { groupId: item.groupId, categoryId: null },
        ),
    };
  });

  const movementsState = movementsResource.state;
  const movementsStale =
    movementsState.status === "ready" && movementsState.data.forCategory !== drilledCategory;
  const movementsStatus = !drilledCategory
    ? "ready"
    : movementsStale
      ? "loading"
      : movementsState.status;
  const movementRows: SpendingMovementRowData[] | null = drilledCategory
    ? movementsState.status === "ready" && !movementsStale
      ? movementsState.data.result.items.map((item) => {
          const info = lookup.category(item.categoryId);
          const installment =
            item.installmentCount > 1 && item.installmentNumber
              ? ` · ${t("reports.spending.installmentOf", {
                  number: item.installmentNumber,
                  count: item.installmentCount,
                })}`
              : "";
          return {
            key: `${item.movementId}:${item.installmentNumber ?? 0}`,
            title: item.description ?? info.name,
            caption: `${shortDate(item.occurredOn, locale)}${installment}`,
            amount: {
              amount: minorToUnits(item.ownAmountMinor),
              currency,
              locale,
              direction: "expense",
            },
            badge: info,
          };
        })
      : []
    : null;

  const crumb = drilledCategory
    ? {
        label: group ? lookup.group(group.groupId).name : "",
        onBack: () =>
          setSelection(selection ? { groupId: selection.groupId, categoryId: null } : null),
      }
    : selection
      ? { label: t("reports.spending.allGroups"), onBack: () => setSelection(null) }
      : null;

  const status = state.status;

  return (
    <SpendingPanel
      status={status}
      messages={messages}
      totalLabel={t("reports.spending.total", { amount: money(report?.totalMinor ?? 0) })}
      crumb={crumb}
      rows={rows}
      movements={movementRows}
      movementsStatus={movementsStatus}
      onRetry={() => {
        reload();
        movementsResource.reload();
      }}
    />
  );
}
