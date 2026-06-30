import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Generates all PWA icons (favicon, apple-touch-icon, maskable + standard
// PWA icons) from the brand logo: public/app-icon-source.png
// Run with: npm run generate:pwa-assets
export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: {
    ...minimal2023Preset,
    // Maskable (Android squircle/circle): pad on the logo's own black so the
    // rooster stays inside the safe zone with no visible seam.
    maskable: {
      sizes: [512],
      padding: 0.12,
      resizeOptions: { background: "#000000" },
    },
    // Apple touch icon: iOS only rounds the corners, so let the logo fill the
    // tile (it already carries its own margin). Match the black background.
    apple: {
      sizes: [180],
      padding: 0,
      resizeOptions: { background: "#000000" },
    },
  },
  images: ["public/app-icon-source.png"],
});
