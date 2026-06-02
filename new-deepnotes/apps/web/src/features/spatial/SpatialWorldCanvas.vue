<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";

import { useSpatialViewport } from "./useSpatialViewport";
import { isDark } from "@/features/theme/useThemePreference";

const rootRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
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

// --- Canvas grid: draws 100-unit grid lines that track the camera ---
watchEffect(() => {
  const canvas = canvasRef.value;
  const root = rootRef.value;
  if (!canvas || !root) return;

  const rect = root.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width;
  const h = rect.height;

  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const z = zoom.value;
  if (z <= 0) return;

  const gridSize = 100;
  const startWorldX = camX.value - (w / 2) / z;
  const startWorldY = camY.value - (h / 2) / z;
  const endWorldX = camX.value + (w / 2) / z;
  const endWorldY = camY.value + (h / 2) / z;

  const firstGridX = Math.floor(startWorldX / gridSize) * gridSize;
  const firstGridY = Math.floor(startWorldY / gridSize) * gridSize;

  ctx.strokeStyle = isDark.value ? "#5a5a5a" : "#484848";
  ctx.lineWidth = Math.max(0.5, 1 * z);

  ctx.beginPath();
  for (let x = firstGridX; x <= endWorldX; x += gridSize) {
    const screenX = (x - camX.value) * z + w / 2;
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, h);
  }
  for (let y = firstGridY; y <= endWorldY; y += gridSize) {
    const screenY = (y - camY.value) * z + h / 2;
    ctx.moveTo(0, screenY);
    ctx.lineTo(w, screenY);
  }
  ctx.stroke();
});
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
    <canvas
      ref="canvasRef"
      class="pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
    <div class="absolute top-1/2 left-1/2 h-0 w-0">
      <div class="will-change-transform" :style="worldTransform">
        <slot />
      </div>
    </div>
  </div>
</template>
