import type { ResizeListener } from '@stdlib/misc';
import {
  isNumeric,
  observeResize,
  splitStr,
  unobserveResize,
} from '@stdlib/misc';
import { nanoid } from 'nanoid';
import type { Cookies } from 'quasar';

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

export async function usePost<T>(url: string, data?: any): Promise<T> {
  return await useAsyncData<T>(
    url,
    async () => (await api().post(url, data)).data,
  );
}
