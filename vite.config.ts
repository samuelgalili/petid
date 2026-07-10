import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: mode === "development"
        ? {
            "/api": {
              target: env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000",
              changeOrigin: true,
            },
          }
        : undefined,
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.ts",
        registerType: "autoUpdate",
        includeAssets: ["robots.txt", "apple-touch-icon.png"],
        manifest: {
          name: "MIPO - My Precious One",
          short_name: "MIPO",
          description: "אפליקציה לניהול ומעקב אחר חיות המחמד שלכם - פרופיל, טיפול, חנות וקהילה",
          theme_color: "#6C63FF",
          background_color: "#FFFFFF",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          lang: "he",
          dir: "rtl",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
          ],
        },
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MiB
          globPatterns: ["**/*.{js,css,html,ico,png,jpg,jpeg,svg,gif,webp}"],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ].filter(Boolean),
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
