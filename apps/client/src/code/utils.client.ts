import { isString } from 'lodash';
import type { QDialogOptions } from 'quasar';

export async function asyncPrompt<T = any>(opts: QDialogOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    $quasar()
      .dialog(opts)
      .onOk(async (output: T) => {
        resolve(output);
      })
      .onCancel(() => {
        reject();
      });
  });
}

export function handleError(error: any, logger = mainLogger()) {
  if (error == null) {
    return;
  }

  $quasar().notify({
    message: isString(error)
      ? error
      : error.response?.data?.errors?.[0]?.message ??
        error.response?.data?.message ??
        error.message ??
        'An error has occurred.',
    type: 'negative',
  });

  logger.error(error);
}

export function shouldRememberSession() {
  return (
    internals.localStorage.getItem('rememberSession') === 'true' &&
    internals.localStorage.getItem('demo') !== 'true'
  );
}

export function wrapStorage(storage: Storage) {
  const props = {
    clear: storage.clear.bind(storage),
    getItem: storage.getItem.bind(storage),
    key: storage.key.bind(storage),
    removeItem: storage.removeItem.bind(storage),
    setItem: storage.setItem.bind(storage),
  };

  return new Proxy(storage, {
    get(target, prop) {
      if (prop in props) {
        return props[prop as keyof typeof props];
      } else {
        return target[prop as keyof typeof target];
      }
    },

    set(target, prop, value) {
      if (prop in props) {
        return (props[prop as keyof typeof props] = value);
      } else {
        return (target[prop as keyof typeof target] = value);
      }
    },
  });
}

export function isCtrlDown(event: KeyboardEvent | MouseEvent) {
  return event.ctrlKey || event.metaKey;
}
export function getCtrlKeyName() {
  return $quasar().platform.is.mac ? '⌘' : 'Ctrl';
}
