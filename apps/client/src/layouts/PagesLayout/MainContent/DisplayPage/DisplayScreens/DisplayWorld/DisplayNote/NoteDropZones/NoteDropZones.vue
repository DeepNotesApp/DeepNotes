<template>
  <div v-if="note.react.region.type === 'note' && page.dragging.react.active">
    <NoteDropZone
      :parent-note="note.react.region"
      :index="note.react.index"
      :style="{
        top: note.react.region.react.collab.container.horizontal ? '0' : '0%',
        bottom: note.react.region.react.collab.container.horizontal
          ? '0'
          : '50%',
        left: note.react.region.react.collab.container.horizontal ? '0%' : '0',
        right: note.react.region.react.collab.container.horizontal
          ? '50%'
          : '0',
      }"
    />

    <NoteDropZone
      :parent-note="note.react.region"
      :index="note.react.index + 1"
      :style="{
        top: note.react.region.react.collab.container.horizontal ? '0' : '50%',
        bottom: note.react.region.react.collab.container.horizontal
          ? '0'
          : '0%',
        left: note.react.region.react.collab.container.horizontal ? '50%' : '0',
        right: note.react.region.react.collab.container.horizontal ? '0%' : '0',
      }"
    />
  </div>
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

import NoteDropZone from './NoteDropZone.vue';

const note = inject<PageNote>('note')!;
const page = inject<Page>('page')!;
</script>
