<template>
  <div
    class="note-spatial-container note-container-frame"
    @pointerover.stop="onPointerOver"
    @pointerout.stop="onPointerOut"
    @pointerdown.left.stop="onLeftPointerDown"
    @pointerup.left="onLeftPointerUp"
  >
    <div
      class="note-spatial-background"
      @dblclick.left="onLeftDoubleClick"
    >
      <!-- Placeholder -->

      <template v-if="note.react.notes.length === 0">
        <div>Drag notes here or</div>
        <div>double-click to create.</div>
      </template>
    </div>

    <DisplayArrows :region="note" />

    <DOMDisplay :region="note">
      <DisplayNote
        v-for="(childNote, index) in note.react.notes"
        :key="childNote.id"
        :note="childNote"
        :index="index"
      />
    </DOMDisplay>

    <InterregionalArrows :region="note" />

    <DisplayBoxSelection :region="note" />

    <!-- Fake drop zone -->

    <div
      v-if="
        page.dragging.react.active &&
        page.dragging.react.dropRegionId == null &&
        pointerOver
      "
      class="note-spatial-drop-zone"
    ></div>
  </div>
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note.client';
import type { Page } from 'src/code/pages/page/page.client';
import { isCtrlDown } from 'src/code/utils.client';

import DisplayArrows from '../../../DisplayArrows.vue';
import DisplayBoxSelection from '../../../DisplayBoxSelection.vue';
import DOMDisplay from '../../../DOMDisplay.vue';
import InterregionalArrows from '../../../InterregionalArrows.vue';
import DisplayNote from '../../DisplayNote.vue';

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;

const pointerOver = ref(false);

function onPointerOver() {
  pointerOver.value = true;
}
function onPointerOut() {
  pointerOver.value = false;
}

function onLeftPointerDown(event: PointerEvent) {
  page.editing.stop();

  if (!isCtrlDown(event) && !event.shiftKey && !internals.mobileAltKey) {
    page.selection.clear(note);
  }

  page.boxSelection.start(event, note);
}
async function onLeftPointerUp() {
  if (!page.dragging.react.active) {
    return;
  }

  await page.dropping.perform(note);
}

async function onLeftDoubleClick(event: MouseEvent) {
  const containerWorldTopLeft = note.getContainerWorldRect()?.topLeft;

  if (containerWorldTopLeft == null) {
    return;
  }

  await page.notes.create(
    note,
    page.pos.eventToWorld(event).sub(containerWorldTopLeft),
  );
}
</script>

<style scoped>
.note-spatial-layer {
  position: absolute;

  inset: 0;

  pointer-events: none;

  isolation: isolate;
}

.note-spatial-container {
  position: absolute;

  inset: 9px;

  border-radius: 5px;

  background-color: rgba(0, 0, 0, 0.4);

  z-index: 2147483646;
}

.note-spatial-background {
  position: absolute;
  inset: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: #e0e0e0;
  font-size: 12px;
}

.note-spatial-drop-zone {
  position: absolute;

  inset: 0;

  border-radius: 5px;

  background-color: #42a5f5;
  opacity: 0.25;

  pointer-events: none;

  z-index: 2147483647;
}
</style>
