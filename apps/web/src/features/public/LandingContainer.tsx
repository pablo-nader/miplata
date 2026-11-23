import { useTranslation } from "react-i18next";
import { LandingScreen } from "./LandingScreen";

export function LandingContainer() {
  const { t } = useTranslation();
  const points = t("public.landing.points", { returnObjects: true }) as string[];
  return (
    <LandingScreen
      brandName={t("app.name")}
      tagline={t("public.landing.tagline")}
      signInLabel={t("public.landing.signIn")}
      signInTo="/sign-in"
      aboutLabel={t("public.landing.about")}
      description={t("public.landing.description")}
      points={points}
      status={t("public.landing.status")}
    />
  );
}
