import 'vue';

import type { internals } from 'src/boot/internals.universal';

declare module 'vue' {
  interface ComponentCustomProperties {
    global: typeof globalThis;
    internals: typeof internals;

    api: typeof api;

    appStore: typeof appStore;
    authStore: typeof authStore;
    uiStore: typeof uiStore;
    pagesStore: typeof pagesStore;
  }
}
