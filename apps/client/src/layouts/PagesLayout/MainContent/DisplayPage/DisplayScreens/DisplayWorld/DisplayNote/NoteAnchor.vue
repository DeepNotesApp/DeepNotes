<template>
  <div
    :id="`note-${note.id}`"
    class="note-anchor"
    :class="{
      'note-dragging': note.react.dragging,
    }"
    :style="{
      position:
        note.react.floating || note.react.resizing?.active
          ? 'absolute'
          : 'relative',

      left: note.react.resizing?.active
        ? `${note.react.resizing.newWorldRect.topLeft.x}px`
        : note.react.floating
        ? `${note.react.collab?.pos?.x}px`
        : undefined,
      top: note.react.resizing?.active
        ? `${note.react.resizing.newWorldRect.topLeft.y}px`
        : note.react.floating
        ? `${note.react.collab?.pos?.y}px`
        : undefined,

      width:
        note.react.floating || note.react.resizing?.active ? '0' : undefined,
      height:
        note.react.floating || note.react.resizing?.active ? '0' : undefined,

      opacity:
        note.react.dragging || note.react.resizing?.active ? '0.7' : undefined,

      visibility: !note.react.loaded ? 'hidden' : undefined,

      'z-index': note.react.floating ? note.react.collab?.zIndex : undefined,
    }"
  >
    <slot v-if="note.react.collab != null"></slot>
  </div>
</template>

<script setup lang="ts">
import type { PageNote } from 'src/code/pages/page/notes/note.client';

const note = inject<PageNote>('note')!;
</script>

<style>
.note-dragging,
.note-dragging * {
  pointer-events: none !important;
}
</style>
