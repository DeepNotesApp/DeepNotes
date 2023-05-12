<template>
  <div
    v-if="!page.react.readOnly && note.react.active && !note.react.dragging"
    class="note-arrow-handles"
    :style="{
      // Arrow creation pointer events only work on Firefox mobile if the handles exist.
      // So we have to use visibility. We can't use v-if or display: none to hide them.
      visibility: page.arrowCreation.react.active ? 'hidden' : undefined,
    }"
  >
    <NoteArrowHandle
      :anchor="new Vec2(-1, 0)"
      style="top: 50%"
      :style="{
        left: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(-50%, -50%) rotateZ(-90deg) scale(${page.camera.react.handleScale})`,
      }"
    />

    <NoteArrowHandle
      :anchor="new Vec2(1, 0)"
      style="top: 50%"
      :style="{
        right: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(50%, -50%) rotateZ(90deg) scale(${page.camera.react.handleScale})`,
      }"
    />

    <NoteArrowHandle
      :anchor="new Vec2(0, -1)"
      :style="{
        top: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(-50%, -50%) rotateZ(0deg) scale(${page.camera.react.handleScale})`,
      }"
    />

    <NoteArrowHandle
      :anchor="new Vec2(0, 1)"
      :style="{
        bottom: `${-20 * page.camera.react.handleScale}px`,
        transform: `translate(-50%, 50%) rotateZ(180deg) scale(${page.camera.react.handleScale})`,
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { Vec2 } from '@stdlib/misc';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

import NoteArrowHandle from './NoteArrowHandle.vue';

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;
</script>
