import { useCallback, useEffect, useState } from "react";
import {
  type BeforeInstallPromptEvent,
  isStandalone,
  isIOSSafari,
  installRecentlyDismissed,
  markInstallDismissed,
} from "@/lib/pwa";

type InstallState = {
  /** Chromium fired beforeinstallprompt — we can show a native install button. */
  canInstall: boolean;
  /** iOS Safari — no native prompt, show manual "Add to Home Screen" instructions. */
  isIOSInstallable: boolean;
  /** Already installed / running standalone. */
  isInstalled: boolean;
  /** Trigger the native install prompt (Chromium only). Returns the outcome. */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
  /** Remember that the user dismissed our banner so we don't nag them. */
  dismiss: () => void;
  /** True if the user recently dismissed the banner. */
  recentlyDismissed: boolean;
};

/**
 * Captures the browser install prompt and exposes a clean API for our UI.
 * On Chromium the deferred event lets us show an in-app "Install App" button.
 * On iOS Safari we surface manual Add-to-Home-Screen instructions instead.
 */
export function useInstallPrompt(): InstallState {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandalone());
  const [recentlyDismissed, setRecentlyDismissed] = useState<boolean>(() =>
    installRecentlyDismissed()
  );

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      // Stop Chrome's mini-infobar; we present our own branded UI.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Reflect display-mode changes (e.g. launched standalone after install).
    const mql = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setIsInstalled(isStandalone());
    mql.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      mql.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === "dismissed") {
      markInstallDismissed();
      setRecentlyDismissed(true);
    }
    return choice.outcome;
  }, [deferred]);

  const dismiss = useCallback(() => {
    markInstallDismissed();
    setRecentlyDismissed(true);
  }, []);

  return {
    canInstall: !!deferred && !isInstalled,
    isIOSInstallable: isIOSSafari() && !isInstalled,
    isInstalled,
    promptInstall,
    dismiss,
    recentlyDismissed,
  };
}
