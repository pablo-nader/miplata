import type { CategoriesResponse, Currency, MonthSummary } from "@miplata/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { minorToUnits } from "../accounts/account-display";
import { fetchBalance } from "../accounts/accounts-api";
import { toBudgetRow } from "../budgets/budget-rows";
import { fetchBudgets } from "../budgets/budgets-api";
import { allCategories, useLabel } from "../categories/catalog";
import { InstallHintContainer } from "../install/InstallHintContainer";
import { fetchMonthSummary, fetchMovements } from "../movements/movements-api";
import { localDate, monthOfDate } from "../movements/present-movement";
import { useLookups } from "../movements/useLookups";
import { fetchOccurrences } from "../recurring/recurring-api";
import { dueKind, pendingExpenses, shortDate } from "../recurring/recurring-display";
import { HomeScreen } from "./HomeScreen";

const LATEST_COUNT = 5;

function fetchLatest() {
  return fetchMovements({}, LATEST_COUNT, 0);
}

function fetchPendingExpenses() {
  return fetchOccurrences("expense");
}

function monthName(month: string, language: string): string {
  return new Intl.DateTimeFormat(language, { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

export function HomeContainer() {
  const { t, i18n } = useTranslation();
  const locale = localeForLanguage(i18n.language);
  const month = monthOfDate(localDate());
  const summaryLoader = useCallback(() => fetchMonthSummary(month), [month]);
  const nearLimitLoader = useCallback(() => fetchBudgets(month, true), [month]);
  const nearLimitResource = useResource(nearLimitLoader);
  const balanceResource = useResource(fetchBalance);
  const summaryResource = useResource(summaryLoader);
  const latestResource = useResource(fetchLatest);
  const pendingResource = useResource(fetchPendingExpenses);
  const lookups = useLookups();
  const categoryLabel = useLabel();

  const totals =
    balanceResource.state.status === "ready" ? balanceResource.state.data.totals : null;
  const total = (currency: Currency) =>
    minorToUnits(totals?.find((entry) => entry.currency === currency)?.totalMinor ?? 0);

  const summary: MonthSummary["totals"] | null =
    summaryResource.state.status === "ready" ? summaryResource.state.data.totals : null;
  const monthly = (currency: Currency) => summary?.find((entry) => entry.currency === currency);
  const name = monthName(month, i18n.language);
  const dollarsIn = minorToUnits(monthly("USD")?.inMinor ?? 0);
  const dollarsOut = minorToUnits(monthly("USD")?.outMinor ?? 0);
  const amountOf = (amount: number, currency: Currency) => ({ amount, currency, locale });

  const nearLimit =
    nearLimitResource.state.status === "ready" && lookups.catalog
      ? {
          label: t("budgets.nearLimitTitle"),
          rows: nearLimitResource.state.data.items.map((budget) =>
            toBudgetRow(
              budget,
              lookups.catalog as CategoriesResponse,
              categoryLabel,
              t,
              i18n.language,
            ),
          ),
        }
      : undefined;

  const latest =
    latestResource.state.status === "ready" && lookups.status === "ready"
      ? {
          label: t("movements.latest"),
          locale,
          rows: latestResource.state.data.items.map((movement) => lookups.present(movement)),
        }
      : undefined;

  const pendingList = pendingResource.state.status === "ready" ? pendingResource.state.data : null;
  const dueItems = pendingList ? pendingExpenses(pendingList.items, pendingList.today) : [];
  const first = dueItems[0];
  const firstName =
    first?.description ??
    (first && lookups.catalog
      ? categoryLabel(
          allCategories(lookups.catalog).find((item) => item.id === first.categoryId) ?? {
            name: null,
            nameKey: null,
          },
        )
      : "");
  const pending =
    pendingList && first
      ? {
          to: "/to-pay",
          title: t("home.pending.title", { count: dueItems.length }),
          caption: [
            [
              firstName,
              dueKind(first.dueOn, pendingList.today) === "overdue"
                ? t("home.pending.overdue", { date: shortDate(first.dueOn, locale) })
                : t("home.pending.today"),
            ]
              .filter(Boolean)
              .join(" "),
            first.suggestedAmountMinor === null
              ? null
              : formatMoney(minorToUnits(first.suggestedAmountMinor), first.currency, locale),
          ]
            .filter(Boolean)
            .join(" · "),
        }
      : undefined;

  return (
    <HomeScreen
      brandName={t("app.name")}
      menu={{ to: "/menu", label: t("nav.menu") }}
      installHint={<InstallHintContainer />}
      emptyTitle={t("screens.home.title")}
      emptyDescription={t("screens.home.description")}
      {...(totals
        ? {
            balance: {
              label: t("screens.balance.title"),
              to: "/balance",
              pesos: { amount: total("ARS"), currency: "ARS", locale },
              dollars: { amount: total("USD"), currency: "USD", locale },
            },
          }
        : {})}
      {...(summary
        ? {
            income: {
              label: t("movements.home.in", { month: name }),
              amount: amountOf(minorToUnits(monthly("ARS")?.inMinor ?? 0), "ARS"),
              ...(dollarsIn !== 0 ? { secondary: amountOf(dollarsIn, "USD") } : {}),
            },
            expense: {
              label: t("movements.home.out", { month: name }),
              amount: amountOf(minorToUnits(monthly("ARS")?.outMinor ?? 0), "ARS"),
              ...(dollarsOut !== 0 ? { secondary: amountOf(dollarsOut, "USD") } : {}),
            },
          }
        : {})}
      {...(pending ? { pending } : {})}
      {...(nearLimit ? { budgets: nearLimit } : {})}
      {...(latest ? { latest } : {})}
    />
  );
}
