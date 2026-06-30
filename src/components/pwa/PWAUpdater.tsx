import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";

/**
 * Registers the service worker and surfaces lifecycle events in-app:
 * - When new content is published and a fresh build deploys, the SW picks it up
 *   and we show a non-blocking "Update available" toast with a one-tap refresh.
 * - On first install we confirm the app is ready to work offline.
 * registerType is "autoUpdate", so the SW also refreshes silently on next launch;
 * the toast just lets active users update immediately.
 */
export const PWAUpdater = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for a new deployment every 60 minutes while the app stays open.
      if (registration) {
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
      }
    },
  });

  useEffect(() => {
    if (offlineReady) {
      toast.success("badly talks is ready to work offline.", {
        duration: 4000,
        onAutoClose: () => setOfflineReady(false),
        onDismiss: () => setOfflineReady(false),
      });
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (needRefresh) {
      toast("A new version is available.", {
        description: "Refresh to get the latest content and improvements.",
        duration: Infinity,
        action: {
          label: "Refresh",
          onClick: () => updateServiceWorker(true),
        },
        onDismiss: () => setNeedRefresh(false),
      });
    }
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
};
