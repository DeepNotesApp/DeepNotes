/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Origin of the HTTP API (no trailing slash). Omit for same-origin requests. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
