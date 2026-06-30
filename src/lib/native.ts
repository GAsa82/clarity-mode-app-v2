import { Capacitor } from "@capacitor/core";

/**
 * Initialises native-only behaviour when the app runs inside the Capacitor
 * shell (Android/iOS). On the web/PWA this is a no-op, and the plugin code is
 * dynamically imported so it never ships in the browser bundle's critical path.
 */
export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark }); // light text on dark bg
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#080b12" });
    }
  } catch {
    /* status bar plugin unavailable — ignore */
  }

  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // Hide once the web app has painted so users never see a blank webview.
    await SplashScreen.hide();
  } catch {
    /* splash plugin unavailable — ignore */
  }

  try {
    const { App } = await import("@capacitor/app");
    // Android hardware back button: go back in history, or background the app
    // when there's nowhere left to go (instead of killing the webview).
    App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        App.minimizeApp();
      }
    });
  } catch {
    /* app plugin unavailable — ignore */
  }
}
