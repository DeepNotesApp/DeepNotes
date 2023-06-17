<template>
  <SVGDisplay
    :region="page"
    class="display-grid"
    :style="{
      top: `-${insetPct}%`,
      right: `-${insetPct}%`,
      bottom: `-${insetPct}%`,
      left: `-${insetPct}%`,
    }"
    :width="`${100 + insetPct * 2}%`"
    :height="`${100 + insetPct * 2}%`"
  >
    <defs>
      <pattern
        :id="`grid-${page.id}`"
        width="100"
        height="100"
        patternUnits="userSpaceOnUse"
      >
        <path
          d="M 100 0 L 0 0 0 100"
          fill="none"
          stroke="#484848"
          stroke-width="1"
        />
      </pattern>
    </defs>

    <rect
      :x="-gridSize / 2"
      :y="-gridSize / 2"
      :width="gridSize"
      :height="gridSize"
      :fill="`url(#grid-${page.id})`"
    />
  </SVGDisplay>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';

import SVGDisplay from './SVGDisplay.vue';

const insetPct = 10000;
const gridSize = 10000000;

const page = inject<Page>('page')!;
</script>

<style scoped>
.display-grid {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  isolation: isolate;

  pointer-events: none;
}
</style>
