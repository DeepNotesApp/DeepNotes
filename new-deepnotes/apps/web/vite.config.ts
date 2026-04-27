import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
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
