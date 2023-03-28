import 'vue';

import type { DeepNotesInternals } from './boot/internals.universal';

declare module 'vue' {
  interface ComponentCustomProperties {
    global: typeof globalThis;
    internals: DeepNotesInternals;

    api: typeof api;

    appStore: typeof appStore;
    authStore: typeof authStore;
    uiStore: typeof uiStore;
    pagesStore: typeof pagesStore;
  }
}
