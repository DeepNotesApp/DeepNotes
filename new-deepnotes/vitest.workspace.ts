import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  // Apps
  "apps/web/vite.config.ts",
  "apps/api-worker/vitest.config.ts",

  // Packages
  "packages/api/vitest.config.ts",
  "packages/db/vitest.config.ts",
  "packages/session/vitest.config.ts",
  "packages/collab-wire/vitest.config.ts",
  "packages/realtime-wire/vitest.config.ts",
]);
