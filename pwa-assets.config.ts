import {
  defineConfig,
  minimal2023Preset,
} from "@vite-pwa/assets-generator/config";

// Generates all PWA icons (favicon, apple-touch-icon, maskable + standard
// PWA icons) from a single source SVG: public/app-icon.svg
// Run with: npm run generate:pwa-assets
export default defineConfig({
  headLinkOptions: {
    preset: "2023",
  },
  preset: {
    ...minimal2023Preset,
    // Pad the maskable icon so the core art stays inside the Android safe zone.
    maskable: {
      sizes: [512],
      padding: 0.3,
      resizeOptions: { background: "#080b12" },
    },
    apple: {
      sizes: [180],
      padding: 0.12,
      resizeOptions: { background: "#080b12" },
    },
  },
  images: ["public/app-icon.svg"],
});
