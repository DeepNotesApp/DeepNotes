import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig, devices } from "@playwright/test";

const appDir = path.dirname(fileURLToPath(import.meta.url));
/** Monorepo root `new-deepnotes/` (parent of `apps/`). */
const workspaceRoot = path.resolve(appDir, "..", "..");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5174",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: "pnpm --filter @deepnotes/api-worker dev",
      cwd: workspaceRoot,
      url: "http://127.0.0.1:8787/api/health",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command:
        "pnpm --filter @deepnotes/web dev -- --host 127.0.0.1 --port 5174 --strictPort",
      cwd: workspaceRoot,
      url: "http://127.0.0.1:5174/",
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
