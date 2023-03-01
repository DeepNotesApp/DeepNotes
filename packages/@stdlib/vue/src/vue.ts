import { Resolvable } from '@stdlib/misc';
import type { UnwrapRef, WatchStopHandle } from 'vue';
import { markRaw, ref, shallowRef, watchEffect } from 'vue';

export function refProp<T>(obj: object, key: string, value: T): UnwrapRef<T> {
  const aux = ref(value);

  Object.defineProperty(obj, key, {
    get() {
      return aux.value;
    },
    set(value) {
      return (aux.value = value);
    },
  });

  return aux.value;
}

export function shallowRefProp<T>(obj: object, key: string, value: T): T {
  const aux = shallowRef(value);

  Object.defineProperty(obj, key, {
    get() {
      return aux.value;
    },
    set(value) {
      return (aux.value = value);
    },
  });

  return aux.value;
}

export class RawObject {
  constructor() {
    return markRaw(this);
  }
}

export function watchUntilTrue(
  effect: (onCleanup: (cleanupFn: () => void) => void) => boolean,
): Resolvable {
  const resolvable = new Resolvable();

  let unwatch: WatchStopHandle | null = null;

  void resolvable.then(() => {
    unwatch?.();
  });

  let result = false;

  unwatch = watchEffect((onCleanup) => {
    result = effect(onCleanup);

    if (result) {
      resolvable.resolve();
    }
  });

  if (result) {
    resolvable.resolve();
  }

  return resolvable;
}
