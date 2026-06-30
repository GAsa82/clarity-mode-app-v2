import type { CapacitorConfig } from "@capacitor/cli";

// Native shell config for the Android (Play Store) and iOS (App Store) builds.
// The web app is built to /dist and bundled into the native container; it talks
// to the same Supabase + Vercel/Railway APIs the PWA uses.
const config: CapacitorConfig = {
  appId: "com.claritymode.app",
  appName: "Clarity Mode",
  webDir: "dist",
  backgroundColor: "#080b12",
  android: {
    backgroundColor: "#080b12",
    allowMixedContent: false,
  },
  ios: {
    backgroundColor: "#080b12",
    contentInset: "always",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#080b12",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK", // dark background, light foreground content
      backgroundColor: "#080b12",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
    },
  },
};

export default config;
