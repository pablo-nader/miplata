import { useTranslation } from "react-i18next";
import { contactEmail, legalUpdatedOn } from "./contact";
import { LegalScreen, type LegalSection } from "./LegalScreen";

type LegalContainerProps = { document: "privacy" | "terms" };

export function LegalContainer({ document }: LegalContainerProps) {
  const { t, i18n } = useTranslation();
  const date = new Intl.DateTimeFormat(i18n.language === "en" ? "en-US" : "es-AR", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(legalUpdatedOn));
  const sections = t(`legal.${document}.sections`, { returnObjects: true }) as LegalSection[];
  return (
    <LegalScreen
      home={{ to: "/", label: t("public.backHome") }}
      brandName={t("app.name")}
      title={t(`legal.${document}.title`)}
      updated={t("legal.updated", { date })}
      intro={t(`legal.${document}.intro`)}
      sections={sections}
      contact={{
        heading: t("legal.contact.heading"),
        text: t(`legal.${document}.contact`),
        email: contactEmail,
      }}
    />
  );
}
