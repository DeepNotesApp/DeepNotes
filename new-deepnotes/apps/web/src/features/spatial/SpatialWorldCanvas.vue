<script setup lang="ts">
import { computed, ref } from "vue";

import { useSpatialViewport } from "./useSpatialViewport";
import { isDark } from "@/features/theme/useThemePreference";

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
  zoomIn,
  zoomOut,
  fitToScreen,
} = useSpatialViewport(rootRef);

defineExpose({
  resetView,
  fitToScreen,
  zoomIn,
  zoomOut,
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

const gridStroke = computed(() => (isDark.value ? "#5a5a5a" : "#484848"));

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
    class="bg-[#e8e8e8] dark:bg-[#1a1a1a] touch-none relative isolate h-full overflow-hidden select-none"
    :class="rootCursorClass"
    @wheel.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @auxclick="onAuxClick"
  >
    <div class="absolute top-1/2 left-1/2 h-0 w-0">
      <div class="will-change-transform" :style="worldTransform">
        <svg
          class="pointer-events-none absolute"
          style="top: -5000000px; left: -5000000px; width: 10000000px; height: 10000000px"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="spatial-grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                :stroke="gridStroke"
                stroke-width="1"
              />
            </pattern>
          </defs>
          <rect
            x="0"
            y="0"
            width="10000000"
            height="10000000"
            fill="url(#spatial-grid)"
          />
        </svg>
        <slot />
      </div>
    </div>
  </div>
</template>
