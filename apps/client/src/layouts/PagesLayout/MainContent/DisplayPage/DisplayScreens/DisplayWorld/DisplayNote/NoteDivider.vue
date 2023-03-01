<template>
  <div
    v-if="
      !note.react.collapsing.collapsed &&
      note.react[section].visible &&
      note.react.bottomSection !== section
    "
    style="position: relative"
  >
    <q-separator style="background: rgba(255, 255, 255, 0.35)" />

    <NoteResizeBar
      side="s"
      :section="section"
    />

    <NoteResizeHandle
      v-if="note.react.floating"
      side="sw"
      :section="section"
      style="margin-top: -0.5px"
    />

    <NoteResizeHandle
      v-if="!note.react.width.stretched"
      side="se"
      :section="section"
      style="margin-top: -0.5px"
    />
  </div>
</template>

<script setup lang="ts">
import type {
  NoteSection,
  PageNote,
} from 'src/code/pages/page/notes/note.client';

import NoteResizeBar from './NoteResizeHandles/NoteResizeBar.vue';
import NoteResizeHandle from './NoteResizeHandles/NoteResizeHandle.vue';

defineProps<{
  section: NoteSection;
}>();

const note = inject<PageNote>('note')!;
</script>
