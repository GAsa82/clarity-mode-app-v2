import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
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
  plugins: [react()].filter(Boolean),
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