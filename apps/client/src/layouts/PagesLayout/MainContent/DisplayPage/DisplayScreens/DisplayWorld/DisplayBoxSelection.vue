<template>
  <div
    v-if="boxSelection.react.active"
    class="box-selection-display"
  >
    <div
      class="box-selection"
      :style="{
        left: `${Math.min(
          boxSelection.react.displayRect.topLeft.x,
          boxSelection.react.displayRect.bottomRight.x,
        )}px`,
        top: `${Math.min(
          boxSelection.react.displayRect.topLeft.y,
          boxSelection.react.displayRect.bottomRight.y,
        )}px`,
        width: `${Math.abs(boxSelection.react.displayRect.size.x)}px`,
        height: `${Math.abs(boxSelection.react.displayRect.size.y)}px`,
      }"
    ></div>
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';

const page = inject<Page>('page')!;
const boxSelection = page.boxSelection;
</script>

<style scoped>
.box-selection-display {
  position: absolute;

  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  pointer-events: none;

  transform-origin: top left;
}

.box-selection {
  position: absolute;

  border: 1px solid rgba(66, 165, 245, 0.8);

  background-color: rgba(33, 150, 243, 0.4);
}
</style>
