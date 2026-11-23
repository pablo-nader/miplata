import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { syncDocumentLanguage } from "../../app/i18n";
import { useSession } from "./useSession";

export function LocaleSync() {
  const { i18n } = useTranslation();
  const { user } = useSession();
  const locale = user?.locale;

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      void i18n.changeLanguage(locale);
      syncDocumentLanguage(locale);
    }
  }, [locale, i18n]);

  return null;
}
