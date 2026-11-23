import type { BalanceLine, BalanceResponse, Currency } from "@miplata/shared";
import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { formatMoney, localeForLanguage } from "../../ui/format/money";
import { displayName, minorToUnits } from "../accounts/account-display";
import { fetchBalance } from "../accounts/accounts-api";
import { type BalanceRowData, BalanceScreen, type BalanceSectionData } from "./BalanceScreen";

const CURRENCIES: readonly Currency[] = ["ARS", "USD"];

function captionFor(line: BalanceLine, t: ReturnType<typeof useTranslation>["t"]): string {
  if (line.type === "credit_card") {
    return t("balance.debt");
  }
  if (line.type === "person") {
    if (line.balanceMinor === 0) {
      return t("accounts.settled");
    }
    return line.balanceMinor > 0 ? t("accounts.owesYou") : t("accounts.youOwe");
  }
  return t(`accounts.types.${line.type}`);
}

export function BalanceContainer() {
  const { t, i18n } = useTranslation();
  const { state, reload } = useResource<BalanceResponse>(fetchBalance);
  const locale = localeForLanguage(i18n.language);
  const data = state.status === "ready" ? state.data : null;

  const sections: BalanceSectionData[] = CURRENCIES.flatMap((currency) => {
    const lines = data?.lines.filter((line) => line.currency === currency) ?? [];
    if (lines.length === 0) {
      return [];
    }
    const total = data?.totals.find((entry) => entry.currency === currency)?.totalMinor ?? 0;
    const rows: BalanceRowData[] = lines.map((line) => {
      const person = line.type === "person";
      const units = minorToUnits(line.balanceMinor);
      return {
        key: `${line.accountId}:${line.currency}`,
        type: line.type,
        title: displayName(line, t),
        caption: captionFor(line, t),
        amount: {
          amount: units,
          currency,
          locale,
          direction: person && units > 0 ? "income" : "neutral",
        },
      };
    });
    return [
      {
        key: currency,
        heading: t("balance.currencyHeading", {
          name: t(`accounts.currencyNames.${currency}`),
          amount: formatMoney(minorToUnits(total), currency, locale),
        }),
        rows,
      },
    ];
  });

  return (
    <BalanceScreen
      title={t("screens.balance.title")}
      back={{ to: "/home", label: t("nav.backHome") }}
      status={state.status}
      sections={sections}
      messages={{
        loading: t("accounts.loading"),
        loadFailed: t("balance.loadFailed"),
        retry: t("accounts.retry"),
        empty: t("balance.empty"),
      }}
      onRetry={reload}
    />
  );
}
