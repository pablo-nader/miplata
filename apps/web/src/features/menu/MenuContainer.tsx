import { type Locale, localeSchema } from "@miplata/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { syncDocumentLanguage } from "../../app/i18n";
import { authClient } from "../auth/auth-client";
import { saveLocale } from "../auth/save-locale";
import { useSession } from "../auth/useSession";
import { MenuScreen } from "./MenuScreen";

export function MenuContainer() {
  const { t, i18n } = useTranslation();
  const { user, refresh } = useSession();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  const current = localeSchema.catch("es").parse(i18n.language);

  async function changeLanguage(value: string) {
    const locale: Locale = localeSchema.catch(current).parse(value);
    setFailed(false);
    await i18n.changeLanguage(locale);
    syncDocumentLanguage(locale);
    const saved = await saveLocale(locale);
    if (saved) {
      await refresh();
    } else {
      setFailed(true);
    }
  }

  async function signOut() {
    await authClient.signOut();
    navigate("/", { replace: true });
  }

  return (
    <MenuScreen
      title={t("screens.menu.title")}
      back={{ to: "/", label: t("nav.backHome") }}
      identity={user?.email ?? ""}
      language={{
        label: t("menu.language"),
        options: [
          { value: "es", label: t("menu.languageNames.es") },
          { value: "en", label: t("menu.languageNames.en") },
        ],
        value: current,
        onChange: (value) => void changeLanguage(value),
      }}
      errorMessage={failed ? t("menu.languageNotSaved") : null}
      signOut={{ label: t("menu.signOut"), onClick: () => void signOut() }}
    />
  );
}
