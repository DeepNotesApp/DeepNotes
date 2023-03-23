<template>
  <q-icon
    class="note-link-icon"
    v-if="note.react.collab.link"
    :name="note.react.link.external ? 'mdi-launch' : 'mdi-link-variant'"
    :size="note.react.link.external ? '15px' : '16px'"
  />
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note';

const note = inject<PageNote>('note')!;
</script>

<style scoped>
.note-link-icon {
  color: white; /* Fix color on note links */

  position: absolute;

  left: 50%;
  top: 2px;

  transform: translate(-50%, -50%);

  pointer-events: none;
}
</style>
