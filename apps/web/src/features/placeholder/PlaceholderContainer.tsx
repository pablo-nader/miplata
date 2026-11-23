import { useTranslation } from "react-i18next";
import { PlaceholderScreen } from "./PlaceholderScreen";

export type ScreenKey =
  | "signIn"
  | "balance"
  | "newMovement"
  | "movements"
  | "accounts"
  | "statement"
  | "payStatement"
  | "toPay"
  | "reports"
  | "menu";

type PlaceholderContainerProps = { screen: ScreenKey; focused?: boolean };

export function PlaceholderContainer({ screen, focused = false }: PlaceholderContainerProps) {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t(`screens.${screen}.title`)}
      description={t(`screens.${screen}.description`)}
      note={t("placeholder.comingSoon")}
      {...(focused ? { back: { to: "/", label: t("nav.backHome") } } : {})}
    />
  );
}
