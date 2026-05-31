import { inject, provide, ref, type InjectionKey, type Ref } from "vue";

export type NoteHeightsMap = Map<string, number>;

const NoteHeightsKey: InjectionKey<{
  heights: Ref<NoteHeightsMap>;
}> = Symbol("note-heights");

export function provideNoteHeights() {
  const heights = ref(new Map<string, number>());
  provide(NoteHeightsKey, { heights });
  return { heights };
}

export function useNoteHeights() {
  return inject(NoteHeightsKey, { heights: ref(new Map<string, number>()) });
}
