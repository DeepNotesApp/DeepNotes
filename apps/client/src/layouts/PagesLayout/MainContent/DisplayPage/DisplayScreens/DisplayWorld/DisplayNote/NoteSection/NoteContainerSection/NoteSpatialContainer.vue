<template>
  <div
    class="note-spatial-container note-container-frame"
    :style="{
      'z-index': page.arrowCreation.react.active ? undefined : 2147483646,
    }"
    @pointerover.stop="onPointerOver"
    @pointerout.stop="onPointerOut"
    @pointerdown.left.stop="onLeftPointerDown"
    @pointerup.left="onLeftPointerUp"
  >
    <div
      class="note-spatial-background"
      @click.left.stop.prevent="onLeftClick"
    >
      <!-- Placeholder -->

      <template v-if="note.react.notes.length === 0">
        <div>Drag notes here or</div>
        <div>double-click to create.</div>
      </template>
    </div>

    <div
      style="
        position: absolute;

        top: 0;
        right: 0;
        bottom: 0;
        left: 0;

        pointer-events: none;

        z-index: 2147483646;
      "
    >
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
    </div>

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
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { createDoubleClickChecker, isCtrlDown } from 'src/code/utils/misc';

import DisplayArrows from '../../../DisplayArrows.vue';
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
async function onLeftPointerUp(event: PointerEvent) {
  if (page.dragging.react.active) {
    await page.dropping.perform(note);
  }

  if (page.arrowCreation.react.active && isCtrlDown(event)) {
    event.stopPropagation();

    page.arrowCreation.react.active = false;

    const containerWorldTopLeft = note.getContainerWorldRect()?.topLeft;

    if (containerWorldTopLeft == null) {
      return;
    }

    const newNote = await page.notes.create({
      region: note,
      worldPos: page.pos.eventToWorld(event).sub(containerWorldTopLeft),
    });

    if (newNote != null) {
      page.arrowCreation.finish({ note: newNote, anchor: null });

      page.selection.set(newNote);
    }
  }
}

const checkDoubleClick = createDoubleClickChecker();

async function onLeftClick(event: MouseEvent) {
  if (checkDoubleClick(event)) {
    const containerWorldTopLeft = note.getContainerWorldRect()?.topLeft;

    if (containerWorldTopLeft == null) {
      return;
    }

    await page.notes.create({
      region: note,
      worldPos: page.pos.eventToWorld(event).sub(containerWorldTopLeft),
    });
  }
}
</script>

<style scoped>
.note-spatial-container {
  flex: 1;
  margin: 9px;

  border-radius: 5px;

  background-color: rgba(0, 0, 0, 0.4);

  cursor: default;

  display: flex;

  position: relative;
}

.note-spatial-background {
  flex: 1;

  position: relative;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: #e0e0e0;
  font-size: 12px;
}

.note-spatial-drop-zone {
  position: absolute;

  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  border-radius: 5px;

  background-color: #42a5f5;
  opacity: 0.25;

  pointer-events: none;

  z-index: 2147483647;
}
</style>
