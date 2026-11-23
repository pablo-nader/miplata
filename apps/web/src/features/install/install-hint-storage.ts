const KEY = "miplata.installHintDismissed";

export function readInstallHintDismissed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function writeInstallHintDismissed(): void {
  try {
    window.localStorage.setItem(KEY, "true");
  } catch {
    return;
  }
}
