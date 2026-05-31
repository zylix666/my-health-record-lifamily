import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { cloudflare } from "@cloudflare/vite-plugin";

const vitestSetup = decodeURIComponent(new URL("./vitest.setup.ts", import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1");

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      strategies: "generateSW",
      includeAssets: ["icon.svg"],
      manifest: {
        id: "/",
        name: "Health Record",
        short_name: "Health Record",
        description: "Offline-first health intake tracker for water, fiber, and protein.",
        theme_color: "#18736f",
        background_color: "#f6fbf8",
        display: "standalone",
        display_override: ["standalone", "fullscreen"],
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "zh-Hant",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        navigateFallback: "index.html"
      }
    }),
    cloudflare()
  ],
  test: {
    environment: "jsdom",
    setupFiles: vitestSetup
  }
});
