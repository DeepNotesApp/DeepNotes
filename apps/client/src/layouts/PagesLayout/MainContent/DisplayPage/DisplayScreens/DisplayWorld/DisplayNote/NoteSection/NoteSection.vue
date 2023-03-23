<template>
  <div
    v-if="note.react.collab[section].enabled"
    v-show="
      !(
        !note.react[section].visible &&
        note.react.collab.width.collapsed === 'Minimum'
      )
    "
    :style="{
      height: note.react[section].visible ? undefined : '0px',
      overflow: note.react[section].visible ? undefined : 'hidden',
    }"
  >
    <div
      :class="`note-${section}-section`"
      style="display: flex"
      :style="{
        height: note.react[section].heightCSS,
        'min-height':
          section === 'container'
            ? note.react.notes.length === 0
              ? '72px'
              : '52.5px'
            : '36.45px',
      }"
    >
      <slot></slot>

      <NoteCollapseBtn :section="section" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NoteSection, PageNote } from 'src/code/pages/page/notes/note';

import NoteCollapseBtn from './NoteCollapseBtn.vue';

defineProps<{
  section: NoteSection;
}>();

const note = inject<PageNote>('note')!;
</script>
