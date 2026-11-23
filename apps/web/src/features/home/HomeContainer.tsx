import { useTranslation } from "react-i18next";
import { HomeScreen } from "./HomeScreen";
import { useHealth } from "./use-health";

type HomeContainerProps = { request?: typeof fetch };

export function HomeContainer({ request }: HomeContainerProps) {
  const { t } = useTranslation();
  const state = useHealth(request);

  return (
    <HomeScreen
      appName={t("app.name")}
      statusLabel={t("health.label")}
      statusKind={state.kind}
      statusText={t(`health.${state.kind === "loading" ? "checking" : state.kind}`)}
      versionText={
        state.kind === "ok" ? t("health.version", { version: state.health.version }) : null
      }
    />
  );
}
