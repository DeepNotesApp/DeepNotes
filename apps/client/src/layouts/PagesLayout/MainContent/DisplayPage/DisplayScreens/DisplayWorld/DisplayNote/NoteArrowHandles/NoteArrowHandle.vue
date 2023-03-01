<template>
  <img
    class="note-arrow-handle"
    draggable="false"
    src="data:image/svg+xml;base64,PCFET0NUWVBFIHN2ZyBQVUJMSUMgIi0vL1czQy8vRFREIFNWRyAxLjEvL0VOIiAiaHR0cDovL3d3dy53My5vcmcvR3JhcGhpY3MvU1ZHLzEuMS9EVEQvc3ZnMTEuZHRkIj48c3ZnIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxOHB4IiBoZWlnaHQ9IjI4cHgiIHZlcnNpb249IjEuMSI+PHBhdGggZD0ibSA2IDI2IEwgMTIgMjYgTCAxMiAxMiBMIDE4IDEyIEwgOSAxIEwgMSAxMiBMIDYgMTIgeiIgc3Ryb2tlPSIjZmZmIiBmaWxsPSIjMjliNmYyIi8+PC9zdmc+"
    @pointerdown.left.stop="page.arrowCreation.start(note, $event)"
  />
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note.client';
import type { Page } from 'src/code/pages/page/page.client';

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
  opacity: 1;
}
</style>

<style>
.hide-ui .note-arrow-handle {
  display: none;
}
</style>
