<template>
  <div
    v-if="
      note.react.collab.resizable &&
      !note.page.react.readOnly &&
      note.react.selected &&
      !note.react.dragging
    "
    class="note-resize-handle"
    :style="{
      left: props.side.includes('w')
        ? '0%'
        : props.side.includes('e')
        ? '100%'
        : '50%',
      top: props.side.includes('n')
        ? '0%'
        : props.side.includes('s')
        ? '100%'
        : '50%',

      cursor: `${side}-resize`,

      transform: `translate(-50%, -50%) scale(${page.camera.react.handleScale})`,
    }"
    @pointerdown.left.stop="onLeftPointerDown"
    @dblclick.left="onLeftDoubleClick"
  ></div>
</template>

<script setup lang="ts">
import type {
  NoteSection,
  NoteSide,
  PageNote,
} from 'src/code/pages/page/notes/note.client';
import type { Page } from 'src/code/pages/page/page.client';

const props = defineProps<{
  side: NoteSide;
  section?: NoteSection;
}>();

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;

const section = computed(
  () =>
    props.section ??
    (props.side.includes('n')
      ? note.react.topSection
      : props.side.includes('s')
      ? note.react.bottomSection
      : undefined),
);

async function onLeftPointerDown(event: PointerEvent) {
  await page.resizing.start(event, note, props.side, section.value);
}

async function onLeftDoubleClick() {
  page.resizing.fitContent(props.side, section.value!);
}
</script>

<style scoped>
.note-resize-handle {
  position: absolute;

  border-radius: 999px;
  width: 10px;
  height: 10px;

  background-color: #2196f3;
  pointer-events: auto;
  z-index: 2147483647;
}
</style>

<style>
.hide-ui .note-resize-handle {
  display: none;
}
</style>
