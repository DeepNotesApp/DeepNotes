import { inject, provide, ref, type InjectionKey, type Ref } from "vue";

export type NoteHeightsMap = Map<string, number>;
export type NoteOriginOffsetsMap = Map<string, number>;

const NoteHeightsKey: InjectionKey<{
  heights: Ref<NoteHeightsMap>;
  originOffsets: Ref<NoteOriginOffsetsMap>;
}> = Symbol("note-heights");

export function provideNoteHeights() {
  const heights = ref(new Map<string, number>());
  const originOffsets = ref(new Map<string, number>());
  provide(NoteHeightsKey, { heights, originOffsets });
  return { heights, originOffsets };
}

export function useNoteHeights() {
  return inject(NoteHeightsKey, {
    heights: ref(new Map<string, number>()),
    originOffsets: ref(new Map<string, number>()),
  });
}
