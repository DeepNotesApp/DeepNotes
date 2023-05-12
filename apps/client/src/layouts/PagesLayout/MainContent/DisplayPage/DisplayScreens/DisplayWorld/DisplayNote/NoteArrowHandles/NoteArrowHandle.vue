<template>
  <svg
    class="note-arrow-handle"
    width="20px"
    height="27px"
    @pointerdown.left.stop="
      page.arrowCreation.start({
        anchorNote: note,
        anchor,
        looseEndpoint: 'target',
        event: $event,
      })
    "
  >
    <path
      d="M 6 27 L 14 27 L 14 14 L 20 14 L 10 0 L 0 14 L 6 14 Z"
      stroke="none"
      fill="#2196f3"
    />
  </svg>
</template>

<script setup lang="ts">
import type { IVec2 } from '@stdlib/misc';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

defineProps<{
  anchor: IVec2;
}>();

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;
</script>

<style scoped>
.note-arrow-handle {
  position: absolute;

  opacity: 0.15;

  cursor: copy;

  z-index: 2147483647;
}
.note-arrow-handle:hover {
  opacity: 0.8;
}
</style>

<style>
.hide-ui .note-arrow-handle {
  display: none;
}
</style>
