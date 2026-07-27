import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Download, Share, Plus, X } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

/**
 * Branded, dismissible "Install App" banner.
 * - Chromium: one-tap native install via the captured beforeinstallprompt event.
 * - iOS Safari: shows the manual Add-to-Home-Screen steps (no native prompt exists).
 * Hidden when already installed, recently dismissed, or while running standalone.
 */
export const InstallPrompt = () => {
  const { canInstall, isIOSInstallable, isInstalled, promptInstall, dismiss, recentlyDismissed } =
    useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const { pathname } = useLocation();

  // Fixed to the viewport bottom, so on admin/founder screens it sits on top
  // of in-flow page content (e.g. form submit buttons) with nothing reserving
  // space for it. Those are workspaces, not install-worthy moments — skip them.
  const isWorkspaceRoute = pathname.startsWith("/admin") || pathname.startsWith("/founder");

  const eligible = (canInstall || isIOSInstallable) && !isInstalled && !recentlyDismissed && !isWorkspaceRoute;

  useEffect(() => {
    if (!eligible) {
      setVisible(false);
      return;
    }
    // Let users see the app first; surface the banner after a short beat.
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [eligible]);

  const handleInstall = async () => {
    if (canInstall) {
      const outcome = await promptInstall();
      if (outcome !== "unavailable") setVisible(false);
    } else if (isIOSInstallable) {
      setShowIOSHelp(true);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setShowIOSHelp(false);
    dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-banner"
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="fixed inset-x-0 z-[60] px-4 pointer-events-none"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}
          role="dialog"
          aria-label="Install badly talks app"
        >
          <div className="pointer-events-auto mx-auto max-w-md rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-elegant overflow-hidden">
            {!showIOSHelp ? (
              <div className="flex items-center gap-3.5 p-3.5">
                <img
                  src="/pwa-192x192.png"
                  alt=""
                  className="w-12 h-12 rounded-xl shrink-0 border border-border"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium leading-tight">Install badly talks</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                    Full-screen app, instant launch, works offline.
                  </p>
                </div>
                <button
                  onClick={handleInstall}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 active:scale-95 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install
                </button>
                <button
                  onClick={handleClose}
                  aria-label="Dismiss"
                  className="shrink-0 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-medium">Add to Home Screen</p>
                  <button
                    onClick={handleClose}
                    aria-label="Dismiss"
                    className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <ol className="space-y-2.5 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-foreground text-[11px] font-medium shrink-0">
                      1
                    </span>
                    <span className="flex items-center gap-1.5">
                      Tap the <Share className="inline w-4 h-4 text-primary" /> Share button below
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-foreground text-[11px] font-medium shrink-0">
                      2
                    </span>
                    <span className="flex items-center gap-1.5">
                      Choose <Plus className="inline w-4 h-4 text-primary" /> Add to Home Screen
                    </span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-foreground text-[11px] font-medium shrink-0">
                      3
                    </span>
                    <span>Tap Add — badly talks lands on your home screen.</span>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
