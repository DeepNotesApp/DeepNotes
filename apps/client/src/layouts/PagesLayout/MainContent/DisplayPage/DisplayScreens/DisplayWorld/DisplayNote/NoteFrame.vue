<template>
  <div
    class="note-frame"
    ref="frameElem"
    style="position: relative"
    :style="{
      'min-width': note.react.width.minCSS,
      width: note.react.width.finalCSS,

      transform:
        note.react.floating && !note.react.resizing?.active
          ? `translate(` +
            `${-note.react.collab.anchor.x * 100}%, ${
              -note.react.collab.anchor.y * 100
            }%)`
          : undefined,
    }"
  >
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { Vec2 } from '@stdlib/misc';
import type { PageNote } from 'src/code/pages/page/notes/note';
import { useResizeObserver } from 'src/code/utils/misc.js';

const emit = defineEmits(['resize']);

const note = inject<PageNote>('note')!;

const frameElem = ref<Element>();

useResizeObserver(
  () => frameElem.value!,
  async (entry: ResizeObserverEntry) => {
    if (entry.contentRect.width === 0 || entry.contentRect.height === 0) {
      return;
    }

    note.react.size = new Vec2(
      entry.contentRect.width,
      entry.contentRect.height,
    );

    emit('resize');

    await nextTick();

    if (note.react.container.visible) {
      const originWorldPos = note.getOriginWorldPos();

      if (originWorldPos == null) {
        return;
      }

      const worldRect = note.getWorldRect('note-frame');

      if (worldRect == null) {
        return;
      }

      note.react.container.originOffset = originWorldPos.sub(worldRect.topLeft);
    }
  },
);
</script>
