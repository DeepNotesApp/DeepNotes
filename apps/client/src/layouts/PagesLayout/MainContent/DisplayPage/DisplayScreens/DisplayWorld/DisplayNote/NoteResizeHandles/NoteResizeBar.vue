<template>
  <div
    v-if="
      note.react.collab.resizable &&
      !note.page.react.readOnly &&
      note.react.selected &&
      !note.react.dragging
    "
    class="note-resize-bar"
    :style="{
      cursor: `${side}-resize`,

      ...(side === 'n' || side === 's'
        ? {
            left: '0px',
            right: '0px',

            [side === 'n' ? 'top' : 'bottom']: '-3px',

            height: '7px',
          }
        : {}),

      ...(side === 'w' || side === 'e'
        ? {
            top: '0px',
            bottom: '0px',

            [side === 'w' ? 'left' : 'right']: '-3px',

            width: '7px',
          }
        : {}),
    }"
    @pointerdown.left.stop="onLeftPointerDown"
    @click.left="onLeftClick"
  ></div>
</template>

<script setup lang="ts">
import type {
  NoteSection,
  NoteSide,
  PageNote,
} from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { createDoubleClickChecker } from 'src/code/utils/misc';

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

const checkDoubleClick = createDoubleClickChecker();

async function onLeftClick(event: MouseEvent) {
  if (checkDoubleClick(event)) {
    page.resizing.fitContent(props.side, section.value!);
  }
}
</script>

<style scoped lang="scss">
.note-resize-bar {
  position: absolute;

  z-index: 2147483646;
}
</style>

<style>
.hide-ui .note-resize-bar {
  display: none;
}
</style>
