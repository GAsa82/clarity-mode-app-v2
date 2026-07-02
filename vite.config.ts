import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Proxy /api/* requests to the FastAPI backend in development.
    // Start the backend with: cd clarity-ai/backend && python main.py
    // In production, vercel.json rewrites /api/* to the Railway backend.
    proxy: mode === "development" ? {
      "/api": {
        // npm run server starts Express on port 3001 (WhatsApp, Newsletter, etc.)
        // Express forwards /api/chat, /api/health, /api/upload, /api/dashboard
        // to the FastAPI backend on port 8000.
        target: process.env.VITE_API_URL || "http://localhost:3001",
        changeOrigin: true,
        secure: false,
      },
    } : undefined,
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          ui: [
            "@radix-ui/react-accordion",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
          ],
          charts: ["recharts"],
          animations: ["framer-motion"],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Precache the app shell; large media (mp4/mp3/jpg) stream + runtime-cache instead.
      includeAssets: [
        "favicon.ico",
        "robots.txt",
        "apple-touch-icon-180x180.png",
      ],
      manifest: {
        name: "badly talks",
        short_name: "badly talks",
        description:
          "Clear mind. Strong self. Focused life. Premium research papers, books, audio sessions, frameworks and protocols for mental clarity.",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        display_override: ["standalone", "minimal-ui"],
        orientation: "portrait",
        theme_color: "#080b12",
        background_color: "#080b12",
        lang: "en",
        dir: "ltr",
        categories: ["health", "lifestyle", "education", "productivity"],
        icons: [
          { src: "pwa-64x64.png", sizes: "64x64", type: "image/png" },
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          {
            src: "maskable-icon-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          { name: "Home", short_name: "Home", url: "/", description: "Open Clarity Mode" },
          { name: "Research", short_name: "Research", url: "/research", description: "Browse research papers" },
          { name: "Pricing", short_name: "Pricing", url: "/pricing", description: "View membership plans" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        // iOS splash images are fetched directly by Safari, not via the SW —
        // keep them out of the precache so we don't ship megabytes twice.
        globIgnores: ["**/splash/**", "**/apple-splash-*.png"],
        // App shell is an SPA — serve index.html for client routes when offline.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // skipWaiting must be true: with it false, phones that keep the PWA
        // alive in the background never close their last "tab", so the new
        // service worker waits forever and users stay on stale bundles for
        // weeks (payment features invisible, old bugs immortal). The in-app
        // update prompt stays as a nicety, but activation no longer depends
        // on it.
        skipWaiting: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.googleapis.com",
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-stylesheets" },
          },
          {
            urlPattern: ({ url }) => url.origin === "https://fonts.gstatic.com",
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase Storage images — cache aggressively for fast repeat loads.
            urlPattern: ({ url, request }) =>
              url.hostname.endsWith("supabase.co") && request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-images",
              expiration: { maxEntries: 250, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Supabase content reads — fresh online, cached fallback offline.
            urlPattern: ({ url }) =>
              url.hostname.endsWith("supabase.co") && url.pathname.startsWith("/rest/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-content",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Any other image (app assets, og, etc.)
            urlPattern: ({ request }) => request.destination === "image",
            handler: "CacheFirst",
            options: {
              cacheName: "images",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
        type: "module",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
}));