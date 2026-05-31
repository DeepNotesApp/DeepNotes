<script setup lang="ts">
import { computed, ref } from "vue";

import { useSpatialViewport } from "./useSpatialViewport";

const rootRef = ref<HTMLElement | null>(null);
const {
  camX,
  camY,
  zoom,
  spaceDown,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  resetView,
  fitToScreen,
} = useSpatialViewport(rootRef);

defineExpose({
  resetView,
  fitToScreen,
  camX,
  camY,
  zoom,
  rootEl: rootRef,
});

const worldTransform = computed(() => {
  const z = zoom.value;
  return {
    transform: `translate(${-camX.value * z}px, ${-camY.value * z}px) scale(${z})`,
    transformOrigin: "0 0" as const,
  };
});

const rootCursorClass = computed(() =>
  spaceDown.value ? "cursor-grab active:cursor-grabbing" : "",
);

function onPointerCancel(e: PointerEvent) {
  onPointerUp(e);
}

function onAuxClick(e: MouseEvent) {
  if (e.button === 1) {
    e.preventDefault();
  }
}
</script>

<template>
  <div
    ref="rootRef"
    data-testid="spatial-world-canvas"
    class="border-border bg-muted/15 touch-none relative isolate h-full overflow-hidden rounded-md border select-none"
    :class="rootCursorClass"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @auxclick="onAuxClick"
  >
    <div
      class="bg-size-[24px_24px] pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.35)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.35)_1px,transparent_1px)] opacity-80"
      aria-hidden="true"
    />
    <div class="absolute top-1/2 left-1/2 h-0 w-0">
      <div class="will-change-transform" :style="worldTransform">
        <slot />
      </div>
    </div>
  </div>
</template>
