import type { SmartComputed } from './smart-computed';
import { createSmartComputed } from './smart-computed';

export function createSmartComputedDict<K = string, V = any>(params: {
  get: (key: K) => V | Promise<V>;
  set?: (key: K, value: V) => void;
  initialValue?: V;
  defaultValue?: V;
}): (key: K) => SmartComputed<V> {
  const dict = new Map<K, SmartComputed<V>>();

  return (key) => {
    let smartComputed = dict.get(key);

    if (smartComputed == null) {
      smartComputed = createSmartComputed({
        ...params,

        get: () => params.get(key),
        set: (value, valueRef) => {
          if (params.set != null) {
            return params.set(key, value);
          } else {
            return (valueRef.value = value);
          }
        },
      });

      dict.set(key, smartComputed);
    }

    return smartComputed;
  };
}
