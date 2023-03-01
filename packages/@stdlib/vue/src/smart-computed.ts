import { isPromiseLike } from '@stdlib/misc';
import type { Ref } from 'vue';
import { computed, ref } from 'vue';

export function createSmartComputed<T>(params: {
  get: () => T | Promise<T>;
  set?: (value: T, valueRef: Ref<T>) => void;
  initialValue?: T;
  defaultValue?: T;
}) {
  const valueRef = ref(params.initialValue) as Ref<T>;

  let counter = 0;

  let currentPromise: Promise<T> | undefined;

  const asyncComputed = computed(async () => {
    const counterAtBeginning = ++counter;

    if ('defaultValue' in params) {
      valueRef.value = params.defaultValue!;
    }

    const result = params.get();

    if (!isPromiseLike(result)) {
      valueRef.value = result;

      return result;
    }

    currentPromise = result;

    let promiseResult = await currentPromise;

    if (counterAtBeginning === counter) {
      valueRef.value = promiseResult;

      currentPromise = undefined;
    }

    while (currentPromise != null) {
      promiseResult = await currentPromise;
    }

    return promiseResult;
  });

  return {
    getAsync: () => asyncComputed.value,

    get: (): T => {
      void asyncComputed.value;

      return valueRef.value;
    },
    set: (value: T) => {
      if (params.set != null) {
        return params.set?.(value, valueRef);
      } else {
        return (valueRef.value = value);
      }
    },
  };
}

export type SmartComputed<T> = ReturnType<typeof createSmartComputed<T>>;
