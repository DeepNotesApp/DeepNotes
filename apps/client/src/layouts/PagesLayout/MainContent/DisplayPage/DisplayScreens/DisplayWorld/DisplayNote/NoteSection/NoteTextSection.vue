<template>
  <NoteSection :section="section">
    <div
      style="flex: 1"
      :style="{ width: note.react.width.targetCSS }"
      @dblclick.left="page.editing.start(note, section)"
    >
      <NoteEditor :section="section" />
    </div>
  </NoteSection>
</template>

<script setup lang="ts">
import type { NoteTextSection, PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

import NoteEditor from './NoteEditor.vue';
import NoteSection from './NoteSection.vue';

defineProps<{
  section: NoteTextSection;
}>();

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;
</script>
