import { useTranslation } from "react-i18next";
import { HomeScreen } from "./HomeScreen";

export function HomeContainer() {
  const { t } = useTranslation();
  return (
    <HomeScreen
      brandName={t("app.name")}
      menu={{ to: "/menu", label: t("nav.menu") }}
      emptyTitle={t("screens.home.title")}
      emptyDescription={t("screens.home.description")}
    />
  );
}
