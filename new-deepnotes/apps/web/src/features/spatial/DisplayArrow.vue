<script setup lang="ts">
import { computed } from "vue";
import type { ArrowModel } from "./arrow-model";
import type { NoteModel } from "./note-model";
import NoteTiptapEditor from "./NoteTiptapEditor.vue";
import { useNoteHeights } from "./useNoteHeights";
import { computeArrowEndpoints } from "./arrow-geometry";
import { resolveArrowColor, lightenColor } from "./color-utils";
import { isDark } from "@/features/theme/useThemePreference";

const props = defineProps<{
  id: string;
  model: ArrowModel;
  sourceModel?: NoteModel;
  targetModel?: NoteModel;
  selected?: boolean;
}>();

const emit = defineEmits<{
  select: [];
  toggle: [];
  reconnectStart: [arrowId: string, from: 'source' | 'target']
  "edit-start": [];
}>();

const labelFragment = computed(() => props.model.label.value);

const arrowColors = computed(() => {
  const base = resolveArrowColor(props.model.color.value);
  return {
    base,
    light: lightenColor(base, 0.3),
    highlight: lightenColor(base, 0.6),
    final: props.selected ? lightenColor(base, 0.3) : base,
  };
});

const { heights: noteHeights } = useNoteHeights();

const isLooseSource = computed(() =>
  props.model.looseEndpoint.value === "source" || !props.sourceModel,
);
const isLooseTarget = computed(() =>
  props.model.looseEndpoint.value === "target" || !props.targetModel,
);

const strokeDasharray = computed(() => {
  const style = props.model.bodyStyle.value;
  if (style === "dashed") return "6,6";
  return undefined;
});

const ARROW_SIZE = 10;

const geometry = computed(() => {
  const s = props.sourceModel;
  const t = props.targetModel;
  const fake = props.model.fakePos.value;

  // Need at least one real endpoint or a fakePos to render
  if (!s && !t && !fake) return null;

  const w1 = s ? ((s.width as any)?.value ?? s.width)?.expanded : undefined;
  const nw1 = w1 === "Auto" ? 160 : w1 ? parseFloat(w1) : 0;
  const h1 = s ? (noteHeights.value.get(props.model.source.value) ?? 80) : 0;

  const w2 = t ? ((t.width as any)?.value ?? t.width)?.expanded : undefined;
  const nw2 = w2 === "Auto" ? 160 : w2 ? parseFloat(w2) : 0;
  const h2 = t ? (noteHeights.value.get(props.model.target.value) ?? 80) : 0;

  const sourceAnchor = props.model.sourceAnchor.value;
  const targetAnchor = props.model.targetAnchor.value;

  // Determine endpoint positions
  let x1: number;
  let y1: number;
  let x2: number;
  let y2: number;

  if (s) {
    x1 = s.pos.value.x + nw1 / 2;
    y1 = s.pos.value.y + h1 / 2;
    if (sourceAnchor) {
      x1 = s.pos.value.x + sourceAnchor.x;
      y1 = s.pos.value.y + sourceAnchor.y;
    }
  } else if (fake) {
    x1 = fake.x;
    y1 = fake.y;
  } else {
    return null;
  }

  if (t) {
    x2 = t.pos.value.x + nw2 / 2;
    y2 = t.pos.value.y + h2 / 2;
    if (targetAnchor) {
      x2 = t.pos.value.x + targetAnchor.x;
      y2 = t.pos.value.y + targetAnchor.y;
    }
  } else if (fake) {
    x2 = fake.x;
    y2 = fake.y;
  } else {
    return null;
  }

  // Apply rectangle-edge intersection when both notes are present
  if (s && t && !sourceAnchor && !targetAnchor) {
    const endpoints = computeArrowEndpoints(
      s.pos.value,
      t.pos.value,
      nw1,
      h1,
      nw2,
      h2,
      true,
    );
    x1 = endpoints.x1;
    y1 = endpoints.y1;
    x2 = endpoints.x2;
    y2 = endpoints.y2;
  }

  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);

  const localX1 = x1 - minX;
  const localY1 = y1 - minY;
  const localX2 = x2 - minX;
  const localY2 = y2 - minY;

  const dx = localX2 - localX1;
  const dy = localY2 - localY1;
  const dist = Math.hypot(dx, dy);

  let pathD: string;
  let sourceAngle: number;
  let targetAngle: number;
  let centerX: number;
  let centerY: number;

  if (props.model.bodyType.value === "curve") {
    const perpX = dy / (dist || 1);
    const perpY = -dx / (dist || 1);
    const offset = dist * 0.25;

    const c1x = localX1 + dx * 0.5 + perpX * offset;
    const c1y = localY1 + dy * 0.5 + perpY * offset;
    const c2x = localX2 - dx * 0.5 + perpX * offset;
    const c2y = localY2 - dy * 0.5 + perpY * offset;

    pathD = `M ${localX1} ${localY1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${localX2} ${localY2}`;

    sourceAngle = Math.atan2(c1y - localY1, c1x - localX1);
    targetAngle = Math.atan2(localY2 - c2y, localX2 - c2x);

    // Cubic bezier midpoint at t=0.5
    centerX = 0.125 * localX1 + 0.375 * c1x + 0.375 * c2x + 0.125 * localX2;
    centerY = 0.125 * localY1 + 0.375 * c1y + 0.375 * c2y + 0.125 * localY2;
  } else {
    pathD = `M ${localX1} ${localY1} L ${localX2} ${localY2}`;

    sourceAngle = Math.atan2(dy, dx);
    targetAngle = Math.atan2(dy, dx);

    centerX = (localX1 + localX2) / 2;
    centerY = (localY1 + localY2) / 2;
  }

  return {
    minX,
    minY,
    localX1,
    localY1,
    localX2,
    localY2,
    pathD,
    sourceAngle,
    targetAngle,
    centerX,
    centerY,
    dist,
    sourceX: x1,
    sourceY: y1,
    targetX: x2,
    targetY: y2,
  };
});

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return;
  e.stopPropagation();
  if (e.ctrlKey || e.metaKey) {
    emit("toggle");
  } else {
    emit("select");
  }
}
</script>

<template>
  <svg
    v-if="geometry"
    data-testid="display-arrow"
    class="pointer-events-none absolute top-0 left-0 overflow-visible"
    :style="{
      width: '1px',
      height: '1px',
      transform: `translate(${geometry.minX}px, ${geometry.minY}px)`,
    }"
  >
    <!-- Hitbox: thick invisible stroke for easy grabbing -->
    <path
      :d="geometry.pathD"
      fill="none"
      stroke="transparent"
      stroke-width="20"
      class="pointer-events-auto cursor-grab"
      @pointerdown="onPointerDown"
    />

    <!-- Visible body -->
    <path
      :d="geometry.pathD"
      fill="none"
      :stroke="arrowColors.final"
      stroke-width="4"
      :stroke-dasharray="strokeDasharray"
    />

    <!-- Source open head -->
    <polyline
      v-if="model.sourceHead.value === 'open'"
      :stroke="arrowColors.final"
      :points="`${geometry.localX1 - ARROW_SIZE},${geometry.localY1 - ARROW_SIZE} ${geometry.localX1},${geometry.localY1} ${geometry.localX1 - ARROW_SIZE},${geometry.localY1 + ARROW_SIZE}`"
      :transform="`rotate(${(geometry.sourceAngle / Math.PI) * 180 + 180},${geometry.localX1},${geometry.localY1})`"
      fill="none"
      stroke-width="4"
    />

    <!-- Target open head -->
    <polyline
      v-if="model.targetHead.value === 'open'"
      :stroke="arrowColors.final"
      :points="`${geometry.localX2 - ARROW_SIZE},${geometry.localY2 - ARROW_SIZE} ${geometry.localX2},${geometry.localY2} ${geometry.localX2 - ARROW_SIZE},${geometry.localY2 + ARROW_SIZE}`"
      :transform="`rotate(${(geometry.targetAngle / Math.PI) * 180},${geometry.localX2},${geometry.localY2})`"
      fill="none"
      stroke-width="4"
    />

    <!-- Source connection zone -->
    <circle
      v-if="sourceModel"
      :cx="geometry.localX1"
      :cy="geometry.localY1"
      r="8"
      fill="transparent"
      stroke="transparent"
      class="pointer-events-auto cursor-crosshair hover:fill-primary/20"
      @pointerdown.stop="emit('reconnectStart', id, 'source')"
    />

    <!-- Target connection zone -->
    <circle
      v-if="targetModel"
      :cx="geometry.localX2"
      :cy="geometry.localY2"
      r="8"
      fill="transparent"
      stroke="transparent"
      class="pointer-events-auto cursor-crosshair hover:fill-primary/20"
      @pointerdown.stop="emit('reconnectStart', id, 'target')"
    />

    <!-- Loose endpoint indicators -->
    <circle
      v-if="isLooseSource"
      :cx="geometry.localX1"
      :cy="geometry.localY1"
      r="4"
      :fill="arrowColors.final"
      :stroke="isDark ? 'white' : '#1a1a1a'"
      stroke-width="1.5"
    />
    <circle
      v-if="isLooseTarget"
      :cx="geometry.localX2"
      :cy="geometry.localY2"
      r="4"
      :fill="arrowColors.final"
      :stroke="isDark ? 'white' : '#1a1a1a'"
      stroke-width="1.5"
    />

    <!-- Arrow label at midpoint -->
    <foreignObject
      v-if="labelFragment"
      :x="geometry.centerX - 60"
      :y="geometry.centerY - 16"
      width="120"
      height="32"
      class="pointer-events-auto"
    >
      <div
        class="h-full w-full rounded px-1"
        :style="{ backgroundColor: isDark ? 'rgba(24,24,24,0.9)' : 'rgba(255,255,255,0.9)' }"
        @focusin="emit('edit-start')"
      >
        <NoteTiptapEditor
          :fragment="labelFragment"
          :editable="!props.model.readOnly.value"
          placeholder="Label…"
          :note-id="id"
          section="label"
        />
      </div>
    </foreignObject>
  </svg>
</template>
