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

type PlaceholderContainerProps = { screen: ScreenKey };

export function PlaceholderContainer({ screen }: PlaceholderContainerProps) {
  const { t } = useTranslation();
  return (
    <PlaceholderScreen
      title={t(`screens.${screen}.title`)}
      description={t(`screens.${screen}.description`)}
      note={t("placeholder.comingSoon")}
    />
  );
}
