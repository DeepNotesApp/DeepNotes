import { ref, type Ref } from "vue";
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
    value.value = (ymap.get(key) as number) ?? defaultValue;
  });
  return value;
}

export function useYMapBoolean(
  ymap: Y.Map<any>,
  key: string,
  defaultValue = false,
): Ref<boolean> {
  const value = ref<boolean>((ymap.get(key) as boolean) ?? defaultValue);
  ymap.observe(() => {
    value.value = (ymap.get(key) as boolean) ?? defaultValue;
  });
  return value;
}

export function useYMapString(
  ymap: Y.Map<any>,
  key: string,
  defaultValue = "",
): Ref<string> {
  const value = ref<string>((ymap.get(key) as string) ?? defaultValue);
  ymap.observe(() => {
    value.value = (ymap.get(key) as string) ?? defaultValue;
  });
  return value;
}

export function useYArrayValues<T>(yarr: Y.Array<any>): Ref<T[]> {
  const value = ref(yarr.toArray() as T[]) as Ref<T[]>;
  yarr.observe(() => {
    value.value = yarr.toArray() as T[];
  });
  return value;
}
