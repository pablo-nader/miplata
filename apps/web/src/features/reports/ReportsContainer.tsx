import type { Currency } from "@miplata/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { localeForLanguage } from "../../ui/format/money";
import { displayName } from "../accounts/account-display";
import { fetchAccounts } from "../accounts/accounts-api";
import { useCategories } from "../categories/useCategories";
import { ChangesContainer } from "./ChangesContainer";
import { CommittedContainer } from "./CommittedContainer";
import { MonthlyContainer } from "./MonthlyContainer";
import { PanelState } from "./PanelState";
import type { PanelContainerProps } from "./panel-props";
import { ReportsScreen } from "./ReportsScreen";
import { createLookup } from "./report-catalog";
import { currentMonth, formatMonthLabel, shiftMonth } from "./report-view";
import { SpendingContainer } from "./SpendingContainer";

const TABS = ["spending", "monthly", "changes", "committed"] as const;
type TabId = (typeof TABS)[number];

const CURRENCIES: readonly Currency[] = ["ARS", "USD"];

const PANELS: Record<TabId, (props: PanelContainerProps) => React.JSX.Element> = {
  spending: SpendingContainer,
  monthly: MonthlyContainer,
  changes: ChangesContainer,
  committed: CommittedContainer,
};

function isCurrency(value: string): value is Currency {
  return CURRENCIES.some((item) => item === value);
}

export function ReportsContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const [tab, setTab] = useState<TabId>("spending");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [month, setMonth] = useState(() => currentMonth());
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const categories = useCategories();
  const accounts = useResource(fetchAccounts);
  const catalog = categories.state.status === "ready" ? categories.state.catalog : null;
  const lookup = useMemo(() => createLookup(catalog, t), [catalog, t]);

  const filters = useMemo(
    () => ({
      currency,
      accountId: accountId || null,
      categoryId: categoryId || null,
    }),
    [currency, accountId, categoryId],
  );

  const accountOptions =
    accounts.state.status === "ready"
      ? accounts.state.data
          .filter((account) => account.type !== "person")
          .map((account) => ({ value: account.id, label: displayName(account, t) }))
      : [];

  const messages = {
    loading: t("reports.loading"),
    loadFailed: t("reports.loadFailed"),
    retry: t("reports.retry"),
    empty: t(`reports.${tab}.empty`),
  };
  const Panel = PANELS[tab];
  const shownMonth = tab === "committed" ? shiftMonth(month, 1) : month;

  return (
    <ReportsScreen
      title={t("screens.reports.title")}
      menu={{ to: "/menu", label: t("nav.menu") }}
      subtitle={`${formatMonthLabel(shownMonth, locale)} · ${currency}`}
      tabsLabel={t("reports.tabsLabel")}
      tabs={TABS.map((id) => ({ id, label: t(`reports.${id}.tab`) }))}
      activeTab={tab}
      onTab={(id) => setTab(id as TabId)}
      currency={{
        label: t("reports.currency"),
        options: CURRENCIES.map((value) => ({
          value,
          label: t(`accounts.currencyNames.${value}`),
        })),
        value: currency,
        onChange: (value) => {
          if (isCurrency(value)) {
            setCurrency(value);
          }
        },
      }}
      period={{
        label: t(`reports.period.${tab}`),
        value: formatMonthLabel(shownMonth, locale),
        previous: t("reports.period.previous"),
        next: t("reports.period.next"),
        onPrevious: () => setMonth((value) => shiftMonth(value, -1)),
        onNext: () => setMonth((value) => shiftMonth(value, 1)),
      }}
      account={{
        label: t("reports.account"),
        allLabel: t("reports.allAccounts"),
        options: accountOptions,
        value: accountId,
        onChange: setAccountId,
      }}
      category={{
        label: t("reports.category"),
        allLabel: t("reports.allCategories"),
        groups: lookup.selectGroups(),
        value: categoryId,
        onChange: setCategoryId,
      }}
    >
      {categories.state.status === "ready" ? (
        <Panel
          key={[tab, month, currency, accountId, categoryId].join("|")}
          month={month}
          filters={filters}
          lookup={lookup}
          locale={locale}
          messages={messages}
        />
      ) : (
        <PanelState
          status={categories.state.status}
          empty={false}
          messages={messages}
          onRetry={categories.reload}
        >
          {null}
        </PanelState>
      )}
    </ReportsScreen>
  );
}
