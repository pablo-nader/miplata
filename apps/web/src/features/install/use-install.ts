import { useSyncExternalStore } from "react";
import { type InstallState, installState, isIosDevice, isStandaloneDisplay } from "./install-state";

type BeforeInstallPrompt = Event & { prompt: () => Promise<unknown> };

type InstallStore = { prompt: BeforeInstallPrompt | null; installed: boolean };

export type Install = {
  state: InstallState;
  install: (() => Promise<void>) | null;
};

let store: InstallStore = { prompt: null, installed: false };
const listeners = new Set<() => void>();

function update(next: InstallStore) {
  store = next;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    update({ ...store, prompt: event as BeforeInstallPrompt });
  });
  window.addEventListener("appinstalled", () => {
    update({ prompt: null, installed: true });
  });
}

export function useInstall(): Install {
  const current = useSyncExternalStore(
    subscribe,
    () => store,
    () => store,
  );
  const media =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : undefined;
  const standalone = isStandaloneDisplay(
    media,
    (navigator as Navigator & { standalone?: boolean }).standalone,
  );
  const prompt = current.prompt;

  return {
    state: installState({
      standalone: current.installed || standalone,
      ios: isIosDevice(navigator.userAgent, navigator.maxTouchPoints),
      promptAvailable: prompt !== null,
    }),
    install: prompt
      ? async () => {
          await prompt.prompt().catch(() => undefined);
          update({ ...store, prompt: null });
        }
      : null,
  };
}
