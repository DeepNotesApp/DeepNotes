<script setup lang="ts">
import { provide, ref } from "vue";

import MainToolbar from "@/features/spatial/MainToolbar.vue";

// --- sidebar state ---
const leftExpanded = ref(true);
const rightExpanded = ref(true);
const leftWidth = ref(240);

function toggleLeft() {
  leftExpanded.value = !leftExpanded.value;
}
function toggleRight() {
  rightExpanded.value = !rightExpanded.value;
}
function resetLeftWidth() {
  leftWidth.value = 240;
}

// --- provide to descendants ---
provide("pageLayout", {
  leftExpanded,
  rightExpanded,
  leftWidth,
  toggleLeft,
  toggleRight,
});

// --- resize handle ---
let resizeActive = false;
function onResizePointerDown(e: PointerEvent) {
  resizeActive = true;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function onResizePointerMove(e: PointerEvent) {
  if (!resizeActive) return;
  leftWidth.value = Math.max(180, Math.min(400, e.clientX));
}
function onResizePointerUp(e: PointerEvent) {
  resizeActive = false;
  try {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <div
    class="bg-background text-foreground fixed inset-0 z-0 flex flex-col overflow-hidden select-none"
  >
    <!-- === Header toolbar === -->
    <MainToolbar
      :left-expanded="leftExpanded"
      :right-expanded="rightExpanded"
      @toggle-left="toggleLeft"
      @toggle-right="toggleRight"
    >
      <slot name="toolbar-center" />
      <template #actions>
        <slot name="toolbar-actions" />
      </template>
    </MainToolbar>

    <!-- === Body: sidebars + canvas === -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Left sidebar -->
      <aside
        v-show="leftExpanded"
        class="border-border/40 bg-muted/30 relative flex flex-col overflow-hidden border-r"
        :style="{ width: `${leftWidth}px`, minWidth: `${leftWidth}px` }"
      >
        <div class="flex-1 overflow-hidden">
          <slot name="left-sidebar" />
        </div>

        <!-- Resize handle -->
        <div
          class="hover:bg-primary/30 absolute top-0 right-0 bottom-0 w-1 cursor-ew-resize"
          @pointerdown="onResizePointerDown"
          @pointermove="onResizePointerMove"
          @pointerup="onResizePointerUp"
          @dblclick="resetLeftWidth"
        />
      </aside>

      <!-- Main canvas area -->
      <main class="relative isolate flex flex-1 flex-col overflow-hidden">
        <slot />

        <!-- Floating overlay (pointer-events-none children get pointer-events-auto) -->
        <div
          class="pointer-events-none absolute inset-0 z-10"
          :style="{ top: '0px' }"
        >
          <slot name="floating-overlay" />
        </div>
      </main>

      <!-- Right sidebar -->
      <aside
        v-show="rightExpanded"
        class="border-border/40 bg-muted/30 flex flex-col overflow-y-auto border-l"
        :style="{ width: '300px', minWidth: '300px' }"
      >
        <div class="p-2">
          <slot name="right-sidebar" />
        </div>
      </aside>
    </div>
  </div>
</template>
