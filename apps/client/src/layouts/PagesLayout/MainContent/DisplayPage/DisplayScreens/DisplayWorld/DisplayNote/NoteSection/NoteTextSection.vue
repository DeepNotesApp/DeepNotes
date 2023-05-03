<template>
  <NoteSection :section="section">
    <div
      style="flex: 1"
      :style="{ width: note.react.width.targetCSS }"
      @click.left="onLeftClick"
    >
      <NoteEditor :section="section" />
    </div>
  </NoteSection>
</template>

<script setup lang="ts">
import type { NoteTextSection, PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { createDoubleClickChecker } from 'src/code/utils/misc';

import NoteEditor from './NoteEditor.vue';
import NoteSection from './NoteSection.vue';

const props = defineProps<{
  section: NoteTextSection;
}>();

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;

const checkDoubleClick = createDoubleClickChecker();

async function onLeftClick(event: MouseEvent) {
  if (checkDoubleClick(event)) {
    await page.editing.start(note, props.section);
  }
}
</script>
