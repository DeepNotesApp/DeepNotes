<template>
  <div
    v-if="
      !page.react.readOnly &&
      !page.arrowCreation.react.active &&
      note.react.active &&
      !note.react.dragging
    "
    class="note-arrow-handles"
  >
    <NoteArrowHandle
      :note="note"
      style="top: 50%"
      :style="{
        left: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(-50%, -50%) rotateZ(-90deg) scale(${page.camera.react.handleScale})`,
      }"
    />

    <NoteArrowHandle
      :note="note"
      style="top: 50%"
      :style="{
        right: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(50%, -50%) rotateZ(90deg) scale(${page.camera.react.handleScale})`,
      }"
    />

    <NoteArrowHandle
      :note="note"
      style="top: -20px"
      :style="{
        top: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(-50%, -50%) rotateZ(0deg) scale(${page.camera.react.handleScale})`,
      }"
    />

    <NoteArrowHandle
      :note="note"
      style="bottom: -20px"
      :style="{
        bottom: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(-50%, 50%) rotateZ(180deg) scale(${page.camera.react.handleScale})`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

import NoteArrowHandle from './NoteArrowHandle.vue';

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;
</script>
