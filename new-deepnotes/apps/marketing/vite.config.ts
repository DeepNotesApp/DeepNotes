import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  envDir: '../..',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(appRoot, "src"),
    },
  },
  ssgOptions: {
    script: "async",
    includedRoutes(paths) {
      const staticPaths = paths.filter((path) => !path.includes(":"));
      const helpSlugs = [
        "what-is-deepnotes",
        "getting-started",
        "creating-notes",
        "sharing-pages",
        "billing-subscriptions",
        "creating-group",
        "inviting-users",
        "joining-group",
        "forgot-password",
        "offline-usage",
        "multi-page-search",
        "roadmap",
        "refund-policy",
        "subscription-expiration",
      ];
      const helpPaths = helpSlugs.map((slug) => `/help/${slug}`);
      return [...staticPaths, ...helpPaths];
    },
  },
});
