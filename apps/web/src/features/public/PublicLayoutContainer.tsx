import { useTranslation } from "react-i18next";
import { type Language, supportedLanguages, syncDocumentLanguage } from "../../app/i18n";
import { PublicLayout } from "./PublicLayout";

export function PublicLayoutContainer() {
  const { t, i18n } = useTranslation();

  function select(language: Language) {
    void i18n.changeLanguage(language);
    syncDocumentLanguage(language);
  }

  return (
    <PublicLayout
      footerLabel={t("public.footer.label")}
      privacy={{ to: "/privacy", label: t("public.footer.privacy") }}
      terms={{ to: "/terms", label: t("public.footer.terms") }}
      languageLabel={t("public.footer.language")}
      languages={supportedLanguages.map((code) => ({
        code,
        label: t(`public.languages.${code}`),
        active: i18n.language === code,
        onSelect: () => select(code),
      }))}
    />
  );
}
