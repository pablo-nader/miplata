import type { Currency, MonthSummary } from "@miplata/shared";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { localeForLanguage } from "../../ui/format/money";
import { minorToUnits } from "../accounts/account-display";
import { fetchBalance } from "../accounts/accounts-api";
import { fetchMonthSummary, fetchMovements } from "../movements/movements-api";
import { localDate, monthOfDate } from "../movements/present-movement";
import { useLookups } from "../movements/useLookups";
import { HomeScreen } from "./HomeScreen";

const LATEST_COUNT = 5;

function fetchLatest() {
  return fetchMovements({}, LATEST_COUNT, 0);
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
  const balanceResource = useResource(fetchBalance);
  const summaryResource = useResource(summaryLoader);
  const latestResource = useResource(fetchLatest);
  const lookups = useLookups();

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

  const latest =
    latestResource.state.status === "ready" && lookups.status === "ready"
      ? {
          label: t("movements.latest"),
          locale,
          rows: latestResource.state.data.items.map((movement) => lookups.present(movement)),
        }
      : undefined;

  return (
    <HomeScreen
      brandName={t("app.name")}
      menu={{ to: "/menu", label: t("nav.menu") }}
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
      {...(latest ? { latest } : {})}
    />
  );
}
