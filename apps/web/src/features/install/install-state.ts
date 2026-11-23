export type InstallState = "installed" | "ios" | "prompt" | "browser";

export type InstallSignals = {
  standalone: boolean;
  ios: boolean;
  promptAvailable: boolean;
};

export function installState({ standalone, ios, promptAvailable }: InstallSignals): InstallState {
  if (standalone) return "installed";
  if (promptAvailable) return "prompt";
  if (ios) return "ios";
  return "browser";
}

export function isIosDevice(userAgent: string, maxTouchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1);
}

export function isStandaloneDisplay(
  media: { matches: boolean } | undefined,
  navigatorStandalone: boolean | undefined,
): boolean {
  return media?.matches === true || navigatorStandalone === true;
}

export function showsInstallHint(state: InstallState, dismissed: boolean): boolean {
  return !dismissed && (state === "ios" || state === "prompt");
}
