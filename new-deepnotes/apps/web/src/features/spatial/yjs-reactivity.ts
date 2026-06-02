import { ref, watch, type Ref } from "vue";
import type * as Y from "yjs";

/**
 * Bridge Yjs Map mutations to a Vue ref.
 * Safe for nested Y.Map / Y.Array values because the ref holds the raw
 * Yjs type; the consumer can compose further reactivity on top.
 */
export function useYMapValue<T>(
  ymap: Y.Map<any>,
  key: string,
): Ref<T | undefined> {
  const value = ref(ymap.get(key) as T | undefined) as Ref<T | undefined>;
  ymap.observe(() => {
    value.value = ymap.get(key) as T | undefined;
  });
  return value;
}

export function useYMapNumber(
  ymap: Y.Map<any>,
  key: string,
  defaultValue = 0,
): Ref<number> {
  const value = ref<number>((ymap.get(key) as number) ?? defaultValue);
  ymap.observe(() => {
    const next = (ymap.get(key) as number) ?? defaultValue;
    if (value.value !== next) {
      value.value = next;
    }
  });
  watch(
    value,
    (next) => {
      if (ymap.get(key) !== next) {
        ymap.set(key, next);
      }
    },
    { flush: "sync" },
  );
  return value;
}

export function useYMapBoolean(
  ymap: Y.Map<any>,
  key: string,
  defaultValue = false,
): Ref<boolean> {
  const value = ref<boolean>((ymap.get(key) as boolean) ?? defaultValue);
  ymap.observe(() => {
    const next = (ymap.get(key) as boolean) ?? defaultValue;
    if (value.value !== next) {
      value.value = next;
    }
  });
  watch(
    value,
    (next) => {
      if (ymap.get(key) !== next) {
        ymap.set(key, next);
      }
    },
    { flush: "sync" },
  );
  return value;
}

export function useYMapString(
  ymap: Y.Map<any>,
  key: string,
  defaultValue = "",
): Ref<string> {
  const value = ref<string>((ymap.get(key) as string) ?? defaultValue);
  ymap.observe(() => {
    const next = (ymap.get(key) as string) ?? defaultValue;
    if (value.value !== next) {
      value.value = next;
    }
  });
  watch(
    value,
    (next) => {
      if (ymap.get(key) !== next) {
        ymap.set(key, next);
      }
    },
    { flush: "sync" },
  );
  return value;
}

export function useYArrayValues<T>(yarr: Y.Array<any>): Ref<T[]> {
  const value = ref(yarr.toArray() as T[]) as Ref<T[]>;
  yarr.observe(() => {
    value.value = yarr.toArray() as T[];
  });
  return value;
}
