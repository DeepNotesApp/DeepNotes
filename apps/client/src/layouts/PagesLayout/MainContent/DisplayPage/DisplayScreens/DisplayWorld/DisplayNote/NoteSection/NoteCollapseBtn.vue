<template>
  <div
    v-if="
      note.react.collab.collapsing.enabled && note.react.topSection === section
    "
    style="flex: none"
  >
    <q-btn
      class="note-collapse-button"
      flat
      :style="{
        height: note.react.numEnabledSections === 1 ? '36.45px' : '100%',
        'border-bottom-right-radius':
          section === note.react.bottomSection ? '6px' : '0',
      }"
      @click.left.stop.prevent="onClick"
      @pointerdown.left.stop
      @dblclick.left.stop
    >
      <q-icon
        :name="
          note.react.collapsing.collapsed
            ? 'mdi-chevron-down'
            : 'mdi-chevron-up'
        "
      />
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { negateProp } from '@stdlib/misc';
import type { NoteSection, PageNote } from 'src/code/pages/page/notes/note';

defineProps<{
  section: NoteSection;
}>();

const note = inject<PageNote>('note')!;

function onClick() {
  note.bringToTop();

  negateProp(note.react.collapsing, 'collapsed');
}
</script>

<style scoped>
.note-collapse-button {
  color: white; /* Fix color on note links */

  min-width: 0 !important;
  width: 32px;

  border-top-left-radius: 0;
  border-bottom-left-radius: 0;

  border-top-right-radius: 6px;
}
</style>
