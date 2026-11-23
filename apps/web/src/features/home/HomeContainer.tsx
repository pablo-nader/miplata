import { useTranslation } from "react-i18next";
import { useResource } from "../../shared/use-resource";
import { localeForLanguage } from "../../ui/format/money";
import { minorToUnits } from "../accounts/account-display";
import { fetchBalance } from "../accounts/accounts-api";
import { HomeScreen } from "./HomeScreen";

export function HomeContainer() {
  const { t, i18n } = useTranslation();
  const { state } = useResource(fetchBalance);
  const locale = localeForLanguage(i18n.language);
  const totals = state.status === "ready" ? state.data.totals : null;
  const total = (currency: "ARS" | "USD") =>
    minorToUnits(totals?.find((entry) => entry.currency === currency)?.totalMinor ?? 0);

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
    />
  );
}
