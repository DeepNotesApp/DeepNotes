import type { Pinia, StoreDefinition } from 'pinia';
import { useAppStore } from 'src/stores/app';
import { useAuthStore } from 'src/stores/auth';
import { usePagesStore } from 'src/stores/pages';
import { useUIStore } from 'src/stores/ui';

const moduleLogger = mainLogger().sub('stores.universal.ts');

function makeStoreFunc<T extends StoreDefinition>(storeDefinition: T) {
  let _store: ReturnType<T>;

  return (pinia?: Pinia): ReturnType<T> => {
    if (_store != null) {
      moduleLogger.debug('Returning saved store');

      return _store;
    }

    let store: ReturnType<T> | undefined;

    if (pinia != null) {
      moduleLogger.debug('Getting store from pinia');

      store = storeDefinition(pinia) as any;
    }

    if (store == null) {
      const pinia =
        getCurrentInstance()?.appContext.app.config.globalProperties.$pinia;

      if (pinia != null) {
        moduleLogger.debug('Getting store from vue instance');

        store = storeDefinition(pinia) as any;
      }
    }

    if (store == null) {
      store = storeDefinition() as any;

      if (store != null) {
        moduleLogger.debug('Getting store with composition API');
      }
    }

    if (store == null) {
      throw new Error(
        'You must provide the Pinia instance on server side code.',
      );
    }

    if (process.env.CLIENT) {
      moduleLogger.debug('Saving store found on client');

      _store = store;
    }

    return store;
  };
}

export const appStore = makeStoreFunc(useAppStore);
export const authStore = makeStoreFunc(useAuthStore);
export const uiStore = makeStoreFunc(useUIStore);
export const pagesStore = makeStoreFunc(usePagesStore);
