<script setup lang="ts">
import { computed } from "vue";
import type { ArrowModel } from "./arrow-model";
import type { NoteModel } from "./note-model";
import NoteTiptapEditor from "./NoteTiptapEditor.vue";
import { useNoteHeights } from "./useNoteHeights";
import { computeArrowEndpoints } from "./arrow-geometry";
import { resolveNoteColorVariants } from "./color-utils";

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

const colorVariants = computed(() => {
  const c = props.model.color.value;
  return resolveNoteColorVariants(c ?? "currentColor");
});

const { heights: noteHeights } = useNoteHeights();

const isLooseSource = computed(() =>
  props.model.looseEndpoint.value === "source" || !props.sourceModel,
);
const isLooseTarget = computed(() =>
  props.model.looseEndpoint.value === "target" || !props.targetModel,
);

const geometry = computed(() => {
  const s = props.sourceModel;
  const t = props.targetModel;
  const fake = props.model.fakePos.value;

  // Need at least one real endpoint or a fakePos to render
  if (!s && !t && !fake) return null;

  const w1 = s?.width.value.expanded;
  const nw1 = w1 === "Auto" ? 160 : w1 ? parseFloat(w1) : 0;
  const h1 = s ? (noteHeights.value.get(props.model.source.value) ?? 80) : 0;

  const w2 = t?.width.value.expanded;
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
    // No source and no fakePos — can't render this end
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
    // No target and no fakePos — can't render this end
    return null;
  }

  // Apply rectangle-edge intersection for line body when both notes are present
  if (s && t && props.model.bodyType.value === "line" && !sourceAnchor && !targetAnchor) {
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

  // Curve control point
  const mx = (localX1 + localX2) / 2;
  const my = (localY1 + localY2) / 2;
  const dx = localX2 - localX1;
  const dy = localY2 - localY1;
  const dist = Math.hypot(dx, dy);
  const curveOffset = props.model.bodyType.value === "curve" ? dist * 0.25 : 0;
  // Perpendicular offset
  const perpX = dy / (dist || 1);
  const perpY = -dx / (dist || 1);
  const cx = mx + perpX * curveOffset;
  const cy = my + perpY * curveOffset;

  const pathD =
    props.model.bodyType.value === "curve"
      ? `M ${localX1} ${localY1} Q ${cx} ${cy} ${localX2} ${localY2}`
      : `M ${localX1} ${localY1} L ${localX2} ${localY2}`;

  // Arrowhead angle at target
  let angle = 0;
  if (props.model.bodyType.value === "curve") {
    // Approximate tangent at endpoint for quadratic bezier
    angle = Math.atan2(localY2 - cy, localX2 - cx);
  } else {
    angle = Math.atan2(localY2 - localY1, localX2 - localX1);
  }

  return {
    minX,
    minY,
    localX1,
    localY1,
    localX2,
    localY2,
    pathD,
    angle,
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
    <!-- Arrow head markers (unique per arrow to avoid color bleeding) -->
    <defs>
      <marker
        :id="`arrowhead-target-${model.source.value}-${model.target.value}`"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto-start-reverse"
      >
        <path d="M 0 1 L 9 5 L 0 9" fill="none" :stroke="colorVariants.base" stroke-width="1.5" />
      </marker>
      <marker
        :id="`arrowhead-source-${model.source.value}-${model.target.value}`"
        markerWidth="10"
        markerHeight="10"
        refX="9"
        refY="5"
        orient="auto-start-reverse"
      >
        <path d="M 0 1 L 9 5 L 0 9" fill="none" :stroke="colorVariants.base" stroke-width="1.5" />
      </marker>
    </defs>

    <!-- Hitbox: thick invisible stroke for easy grabbing -->
    <path
      :d="geometry.pathD"
      fill="none"
      stroke="transparent"
      stroke-width="20"
      class="pointer-events-auto cursor-pointer"
      @pointerdown="onPointerDown"
    />

    <!-- Visible body -->
    <path
      :d="geometry.pathD"
      fill="none"
      :stroke="selected ? 'var(--primary)' : colorVariants.base"
      :stroke-width="selected ? 3 : 2"
      stroke-linecap="round"
      :marker-end="model.targetHead.value ? `url(#arrowhead-target-${model.source.value}-${model.target.value})` : ''"
      :marker-start="model.sourceHead.value ? `url(#arrowhead-source-${model.source.value}-${model.target.value})` : ''"
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
      :fill="colorVariants.base"
      stroke="white"
      stroke-width="1.5"
    />
    <circle
      v-if="isLooseTarget"
      :cx="geometry.localX2"
      :cy="geometry.localY2"
      r="4"
      :fill="colorVariants.base"
      stroke="white"
      stroke-width="1.5"
    />

    <!-- Arrow label at midpoint -->
    <foreignObject
      v-if="labelFragment"
      :x="(geometry.localX1 + geometry.localX2) / 2 - 60"
      :y="(geometry.localY1 + geometry.localY2) / 2 - 16"
      width="120"
      height="32"
      class="pointer-events-auto"
    >
      <div class="h-full w-full" @focusin="emit('edit-start')">
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
