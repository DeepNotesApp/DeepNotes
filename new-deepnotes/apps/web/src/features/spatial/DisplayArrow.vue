<script setup lang="ts">
import { computed } from "vue";
import type { ArrowModel } from "./arrow-model";
import type { NoteModel } from "./note-model";

const props = defineProps<{
  model: ArrowModel;
  sourceModel?: NoteModel;
  targetModel?: NoteModel;
  selected?: boolean;
}>();

const emit = defineEmits<{
  select: [];
  toggle: [];
}>();

const line = computed(() => {
  const s = props.sourceModel;
  const t = props.targetModel;
  if (!s || !t) return null;
  const x1 = s.pos.value.x;
  const y1 = s.pos.value.y;
  const x2 = t.pos.value.x;
  const y2 = t.pos.value.y;
  return { x1, y1, x2, y2 };
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
    v-if="line"
    data-testid="display-arrow"
    class="absolute top-0 left-0 overflow-visible"
    :style="{
      width: '1px',
      height: '1px',
      transform: `translate(${Math.min(line.x1, line.x2)}px, ${Math.min(line.y1, line.y2)}px)`,
    }"
  >
    <line
      :x1="line.x1 - Math.min(line.x1, line.x2)"
      :y1="line.y1 - Math.min(line.y1, line.y2)"
      :x2="line.x2 - Math.min(line.x1, line.x2)"
      :y2="line.y2 - Math.min(line.y1, line.y2)"
      :stroke="selected ? 'var(--primary)' : 'currentColor'"
      :stroke-width="selected ? 3 : 2"
      stroke-linecap="round"
      class="cursor-pointer"
      @pointerdown="onPointerDown"
    />
  </svg>
</template>
