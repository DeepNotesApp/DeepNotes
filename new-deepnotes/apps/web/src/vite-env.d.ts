/// <reference types="vite/client" />

declare module "*.vue" {
  import type { ComponentOptions } from "vue";
  const component: ComponentOptions;
  export default component;
}

interface ImportMetaEnv {
  /** Origin of the HTTP API (no trailing slash). Omit for same-origin requests. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
