<template>
  <div
    v-if="alwaysVisible || page.dragging.react.active"
    class="note-drop-zone"
    :class="{
      active:
        page.dragging.react.active &&
        page.dragging.react.dropRegionId == parentNote.id &&
        page.dragging.react.dropIndex === targetIndex,
    }"
    :style="{
      'pointer-events': page.arrowCreation.react.active ? 'none' : undefined,
    }"
    @pointerover="onPointerOver"
    @pointerout="onPointerOut"
    @pointerup.left="onLeftPointerUp"
  ></div>
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';

const props = defineProps<{
  parentNote: PageNote;
  index?: number;
  alwaysVisible?: boolean;
}>();

const targetIndex = computed(
  () => props.index ?? props.parentNote.react.notes.length,
);

const page = inject<Page>('page')!;

function onPointerOver() {
  if (!page.dragging.react.active) {
    return;
  }

  page.dragging.react.dropRegionId = props.parentNote.id;
  page.dragging.react.dropIndex = targetIndex.value;
}

function onPointerOut() {
  if (!page.dragging.react.active) {
    return;
  }

  page.dragging.react.dropRegionId = undefined;
  page.dragging.react.dropIndex = undefined;
}

async function onLeftPointerUp() {
  if (!page.dragging.react.active) {
    return;
  }

  await page.dropping.perform(props.parentNote, targetIndex.value);
}
</script>

<style scoped>
.note-drop-zone {
  position: absolute;

  left: 0;
  right: 0;
  top: 0;
  bottom: 0;

  background-color: #42a5f5;
  opacity: 0;

  z-index: 2147483640;
}
.note-drop-zone.active {
  opacity: 0.25;
}
</style>
