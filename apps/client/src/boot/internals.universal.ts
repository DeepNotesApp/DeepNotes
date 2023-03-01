import type { KeyPair, SymmetricKeyring } from '@stdlib/crypto';
import { boot } from 'quasar/wrappers';
import { factories } from 'src/code/factories.client';
import type { Pages } from 'src/code/pages/pages.client';
import { RealtimeClient } from 'src/code/realtime/client.universal';
import { shouldRememberSession, wrapStorage } from 'src/code/utils.client';
import type { Ref } from 'vue';
import type { RouteLocationNormalized, Router } from 'vue-router';

import type { tiptap } from './tiptap/index.client';

const moduleLogger = mainLogger().sub('boot/internals.client.ts');

export interface DeepNotesInternals {
  dict: Record<string, any>;

  localStorage: Storage;
  sessionStorage: Storage;
  storage: Storage;

  keyPair: KeyPair;

  symmetricKeyring: SymmetricKeyring;

  personalGroupId: string;

  router: Router;
  route: Ref<RouteLocationNormalized>;

  realtime: RealtimeClient;

  tiptap: typeof tiptap;

  mobileAltKey: boolean;

  pages: Pages;
}

moduleLogger.info('Initializing internals');

export const internals = {} as DeepNotesInternals;

internals.dict = {};

internals.realtime = new (RealtimeClient())();

if (process.env.CLIENT) {
  internals.localStorage ??= wrapStorage(globalThis.localStorage);
  internals.sessionStorage ??= wrapStorage(globalThis.sessionStorage);

  if (shouldRememberSession()) {
    internals.storage = internals.localStorage;
  } else {
    internals.storage = internals.sessionStorage;
  }

  if (!process.env.DEV) {
    Object.defineProperty(globalThis, 'localStorage', { value: undefined });
    Object.defineProperty(globalThis, 'sessionStorage', { value: undefined });
  }

  internals.pages = factories().Pages({});

  if (process.env.DEV) {
    (globalThis as any).internals = internals;
  }
}

export default boot(async ({ store }) => {
  if (process.env.DEV) {
    (internals as any).appStore = appStore(store);
    (internals as any).authStore = authStore(store);
    (internals as any).uiStore = uiStore(store);
    (internals as any).pagesStore = pagesStore(store);
  }
});
