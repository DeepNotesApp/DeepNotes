<template>
  <div
    v-if="
      !note.page.react.readOnly && note.react.selected && !note.react.dragging
    "
  >
    <template v-if="note.react.floating">
      <NoteResizeHandle side="nw" />
      <NoteResizeBar side="n" />
      <NoteResizeHandle side="ne" />
      <NoteResizeHandle side="sw" />
      <NoteResizeBar side="w" />
    </template>

    <template v-if="!note.react.width.stretched">
      <NoteResizeBar side="e" />
      <NoteResizeHandle side="se" />
    </template>

    <NoteResizeBar side="s" />
  </div>
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note.client';

import NoteResizeBar from './NoteResizeBar.vue';
import NoteResizeHandle from './NoteResizeHandle.vue';

const note = inject<PageNote>('note')!;
</script>
