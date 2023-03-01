import type { ComputedRef, WritableComputedRef } from 'vue';
import { computed } from 'vue';

export function createComputedDict<K = string, V = any>(params: {
  get: (key: K) => V;
}): (key: K) => ComputedRef<V>;
export function createComputedDict<K = string, V = any>(params: {
  get: (key: K) => V;
  set: (key: K, value: V) => void;
}): (key: K) => WritableComputedRef<V>;

export function createComputedDict<K = string, V = any>(params: {
  get: (key: K) => V;
  set?: (key: K, value: V) => void;
}): unknown {
  const dict = new Map<K, ComputedRef<V> | WritableComputedRef<V>>();

  return (key: K) => {
    let result: ComputedRef<V> | WritableComputedRef<V> | undefined =
      dict.get(key);

    if (result == null) {
      if ('set' in params) {
        result = computed({
          get: () => params.get(key),
          set: (value) => params.set?.(key, value),
        });
      } else {
        result = computed(() => params.get(key));
      }

      dict.set(key, result);
    }

    return result;
  };
}
