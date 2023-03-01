<template>
  <div
    v-if="boxSelection.react.active && boxSelection.react.region === region"
    class="box-selection-display"
    :style="{
      transform:
        boxSelection.react.region.type === 'note'
          ? `scale(${1 / page.camera.react.zoom})`
          : undefined,
    }"
  >
    <div
      class="box-selection"
      :style="{
        left: `${Math.min(
          boxSelection.react.startPos.x,
          boxSelection.react.endPos.x,
        )}px`,
        top: `${Math.min(
          boxSelection.react.startPos.y,
          boxSelection.react.endPos.y,
        )}px`,
        width: `${Math.abs(
          boxSelection.react.endPos.x - boxSelection.react.startPos.x,
        )}px`,
        height: `${Math.abs(
          boxSelection.react.endPos.y - boxSelection.react.startPos.y,
        )}px`,
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page.client';
import type { PageRegion } from 'src/code/pages/page/regions/region.client';

defineProps<{
  region: PageRegion;
}>();

const page = inject<Page>('page')!;
const boxSelection = page.boxSelection;
</script>

<style scoped>
.box-selection-display {
  position: absolute;

  inset: 0;

  pointer-events: none;

  transform-origin: top left;
}

.box-selection {
  position: absolute;

  border: 1px solid rgba(66, 165, 245, 0.8);

  background-color: rgba(33, 150, 243, 0.4);
}
</style>
