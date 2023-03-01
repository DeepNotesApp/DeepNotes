<template>
  <SVGDisplay
    :region="page"
    class="display-grid"
    :style="{
      inset: `-${insetPct}%`,
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
import type { Page } from 'src/code/pages/page/page.client';

import SVGDisplay from './SVGDisplay.vue';

const insetPct = 10000;
const gridSize = 10000000;

const page = inject<Page>('page')!;
</script>

<style scoped>
.display-grid {
  position: absolute;
  inset: 0;

  isolation: isolate;

  pointer-events: none;
}
</style>
