import createClient from "openapi-fetch";

import type { paths } from "./api-types.generated";

/**
 * Base URL for the DeepNotes HTTP API (no trailing slash). Empty string uses the
 * current origin (Vite dev server proxy or Pages same-origin API).
 */
export function resolveApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL ?? "";
  return raw.replace(/\/$/, "");
}

/** Typed OpenAPI client with `credentials: "include"` for httpOnly session cookies. */
export function createDeepnotesApiClient(baseUrl?: string) {
  const root = baseUrl ?? resolveApiBaseUrl();
  return createClient<paths>({
    baseUrl: root,
    credentials: "include",
  });
}

export type DeepnotesApiClient = ReturnType<typeof createDeepnotesApiClient>;
