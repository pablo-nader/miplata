import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InstallHint } from "../../ui/organisms/InstallHint";
import { readInstallHintDismissed, writeInstallHintDismissed } from "./install-hint-storage";
import { showsInstallHint } from "./install-state";
import { useInstall } from "./use-install";

export function InstallHintContainer() {
  const { t } = useTranslation();
  const { state, install } = useInstall();
  const [dismissed, setDismissed] = useState(readInstallHintDismissed);

  if (!showsInstallHint(state, dismissed)) {
    return null;
  }

  function dismiss() {
    writeInstallHintDismissed();
    setDismissed(true);
  }

  return (
    <InstallHint
      title={t("install.hint.title")}
      instructions={state === "ios" ? t("install.hint.ios") : null}
      action={install ? { label: t("install.action"), onClick: () => void install() } : null}
      dismissLabel={t("install.dismiss")}
      onDismiss={dismiss}
    />
  );
}
