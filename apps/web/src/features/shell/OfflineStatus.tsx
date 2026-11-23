import { useTranslation } from "react-i18next";
import { useOnline } from "../../shared/use-online";
import { OfflineBanner } from "../../ui/organisms/OfflineBanner";

export function OfflineStatus() {
  const { t } = useTranslation();
  const online = useOnline();
  return online ? null : <OfflineBanner message={t("offline.banner")} />;
}
