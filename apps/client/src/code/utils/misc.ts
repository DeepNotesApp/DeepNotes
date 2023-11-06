import type { ResizeListener } from '@stdlib/misc';
import {
  isNumeric,
  observeResize,
  splitStr,
  unobserveResize,
} from '@stdlib/misc';
import { isString, pull } from 'lodash';
import { nanoid } from 'nanoid';
import type { Cookies } from 'quasar';
import type { QDialogOptions } from 'quasar';

export async function asyncDialog<T = any>(opts: QDialogOptions): Promise<T> {
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

export function handleError(error: any, logger = mainLogger) {
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

const _modifiers = ['Alt', 'Control', 'Meta', 'Shift'] as const;
export function modsMatch(
  event: KeyboardEvent | MouseEvent,
  modifiers: (typeof _modifiers)[number][],
) {
  if (modifiers.includes('Control') && $quasar().platform.is.mac) {
    pull(modifiers, 'Control');
    modifiers.push('Meta');
  }

  for (const modifier of _modifiers) {
    if (modifiers.includes(modifier) !== event.getModifierState(modifier)) {
      return false;
    }
  }

  return true;
}
export function getCtrlKeyName() {
  return $quasar().platform.is.mac ? 'Cmd' : 'Ctrl';
}
export function getAltKeyName() {
  return $quasar().platform.is.mac ? 'Option' : 'Alt';
}

export function sizeToCSS(size: string): string {
  if (isNumeric(size)) {
    return `${size}px`;
  } else {
    return 'auto';
  }
}

export function getNameInitials(name: string): string {
  const nameParts = splitStr(name.trim(), ' ');

  let initials = nameParts[0].substring(0, 1).toUpperCase();

  if (nameParts.length > 1) {
    initials += nameParts[nameParts.length - 1].substring(0, 1).toUpperCase();
  }

  return initials;
}

export function multiModePath(path: string) {
  if (process.env.MODE === 'ssr') {
    return path;
  } else {
    return `?rand=${nanoid()}#${path}`;
  }
}

export function useResizeObserver(
  elemFunc: () => Element | PromiseLike<Element>,
  listener: ResizeListener,
) {
  let elem: Element;

  onMounted(async () => {
    elem = await elemFunc();

    observeResize(elem, listener);
  });
  onBeforeUnmount(async () => {
    unobserveResize(elem, listener);
  });
}

// setTimeout interceptor

const oldSetTimeout = setTimeout;
globalThis.setTimeout = newSetTimeout as any;

let _isWithinTimeout = false;

function newSetTimeout(
  callback: (...args: any[]) => void,
  ms?: number,
  ...args: any[]
): NodeJS.Timeout {
  return oldSetTimeout(() => {
    _isWithinTimeout = true;

    callback(args);

    _isWithinTimeout = false;
  }, ms);
}

export function isWithinTimeout() {
  return _isWithinTimeout;
}

export function getRequestConfig(cookies: Cookies | undefined) {
  return process.env.SERVER
    ? {
        headers: {
          cookie: Object.entries(cookies?.getAll())
            .map(([name, value]) => `${name}=${value}`)
            .join(';'),
        },
      }
    : undefined;
}

export async function useAsyncData<T>(
  key: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (process.env.CLIENT && key in appStore().dict) {
    const result = appStore().dict[key];

    delete appStore().dict[key];

    return result;
  }

  const result = await fn();

  if (process.env.SERVER) {
    appStore().dict[key] = result;
  }

  return result;
}

export function debounceTick(func: () => any) {
  let scheduled = false;

  return () => {
    if (scheduled) {
      return;
    }

    scheduled = true;

    void nextTick(() => {
      scheduled = false;

      func();
    });
  };
}

export function createDoubleClickChecker() {
  let doubleClick = false;

  const pos = { x: 0, y: 0 };

  return (event: MouseEvent) => {
    if (doubleClick) {
      doubleClick = false;

      if (
        Math.sqrt(
          Math.pow(event.clientX - pos.x, 2) +
            Math.pow(event.clientY - pos.y, 2),
        ) <= 24
      ) {
        return true;
      }
    } else {
      doubleClick = true;

      pos.x = event.clientX;
      pos.y = event.clientY;

      setTimeout(() => {
        doubleClick = false;
      }, 250);
    }
  };
}
