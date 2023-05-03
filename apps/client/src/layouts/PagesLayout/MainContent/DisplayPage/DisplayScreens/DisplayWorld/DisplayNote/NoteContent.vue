<template>
  <a
    :href="
      note.react.selected ? undefined : note.react.collab.link || undefined
    "
    :style="{ cursor: note.react.cursor }"
    tabindex="-1"
    target="_blank"
  >
    <div
      class="note-content"
      :style="{
        'background-color': note.react.color,

        'border-color': note.react.selected ? '#2196f3' : undefined,
      }"
      @touchstart="onTouchStart"
      @pointerdown.left.stop="onLeftPointerDown"
      @pointerup.left="onLeftPointerUp"
    >
      <slot></slot>
    </div>
  </a>
</template>

<script setup lang="ts">
import {
  hasScrollbar,
  isMouseOverScrollbar,
  isTouchOverScrollbar,
} from '@stdlib/misc';
import type { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { isCtrlDown } from 'src/code/utils/misc';

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;

function onTouchStart(event: TouchEvent) {
  const possiblyScrolling = hasScrollbar(event.target as HTMLElement);

  if (
    getComputedStyle(event.target as Element).touchAction !== 'none' &&
    (!possiblyScrolling ||
      (possiblyScrolling &&
        !isTouchOverScrollbar(event, page.camera.react.zoom)))
  ) {
    event.preventDefault();
  }
}

function onLeftPointerDown(event: PointerEvent) {
  if (isMouseOverScrollbar(event) || note.react.editing) {
    return;
  }

  if (
    (note.react.collab.link || (event.target as Element).closest('a[href]')) &&
    !event.altKey &&
    !event.shiftKey &&
    !internals.mobileAltKey &&
    !note.react.selected
  ) {
    return;
  }

  page.editing.stop();

  page.clickSelection.perform(note, event);

  if (note.react.selected) {
    page.dragging.start(event);
  }
}

function onLeftPointerUp(event: PointerEvent) {
  if (page.arrowCreation.react.active && !isCtrlDown(event)) {
    const arrow = page.arrowCreation.linkNote(note);

    if (arrow != null) {
      page.selection.set(arrow);
    }
  }
}
</script>

<style scoped lang="scss">
.note-content {
  border-radius: 7px;

  border: 1px solid rgba(255, 255, 255, 0.3);

  height: 100%;
}

.note-outer-border {
  position: absolute;
  inset: -1px;
  border-radius: 8px;
  border: 1px solid #2196f3;
  pointer-events: none;
}
</style>
