import { type Locale, localeSchema } from "@miplata/shared";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { syncDocumentLanguage } from "../../app/i18n";
import { saveLocale } from "../auth/save-locale";
import { useSession } from "../auth/useSession";
import { LanguageScreen } from "./LanguageScreen";

export function LanguageContainer() {
  const { t, i18n } = useTranslation();
  const { refresh } = useSession();
  const [failed, setFailed] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const current = localeSchema.catch("es").parse(i18n.language);

  function changeLanguage(value: string) {
    const locale: Locale = localeSchema.catch(current).parse(value);
    setFailed(false);
    queue.current = queue.current
      .then(async () => {
        const saved = await saveLocale(locale);
        if (saved) {
          await i18n.changeLanguage(locale);
          syncDocumentLanguage(locale);
          await refresh();
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
  }

  return (
    <LanguageScreen
      title={t("menu.language")}
      back={{ to: "/menu", label: t("nav.backMenu") }}
      options={[
        { value: "es", label: t("menu.languageNames.es") },
        { value: "en", label: t("menu.languageNames.en") },
      ]}
      value={current}
      errorMessage={failed ? t("menu.languageNotSaved") : null}
      onChange={changeLanguage}
    />
  );
}
