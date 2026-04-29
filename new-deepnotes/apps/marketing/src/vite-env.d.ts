/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute or root-relative URL for the signed-in web app (e.g. https://app.example.com or /). */
  readonly VITE_WEB_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
