import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
    },
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ["libsodium-wrappers-sumo"],
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.ts"],
  },
});
