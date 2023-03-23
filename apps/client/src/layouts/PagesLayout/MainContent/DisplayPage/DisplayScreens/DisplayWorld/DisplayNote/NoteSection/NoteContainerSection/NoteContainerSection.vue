<template>
  <NoteSection
    section="container"
    style="position: relative"
  >
    <NoteSpatialContainer v-if="note.react.collab.container.spatial" />
    <NoteListContainer v-else />
  </NoteSection>
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note';

import NoteSection from '../NoteSection.vue';
import NoteListContainer from './NoteListContainer.vue';
import NoteSpatialContainer from './NoteSpatialContainer.vue';

const note = inject<PageNote>('note')!;
</script>
