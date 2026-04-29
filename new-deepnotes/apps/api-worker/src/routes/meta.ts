import { getOpenApiDocument, healthResponseSchema } from "@deepnotes/api";

import type { ApiHono } from "../api-hono.js";

export function registerMetaRoutes(app: ApiHono): void {
app.get("/api/openapi.json", (c) => c.json(getOpenApiDocument()));

app.get("/api/health", (c) => {
  const body = { status: "ok" as const, service: "deepnotes-api-worker" };
  const parsed = healthResponseSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ status: "error" }, 500);
  }
  return c.json(parsed.data);
});
}
