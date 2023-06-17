<template>
  <svg
    class="svg-display"
    width="100%"
    height="100%"
  >
    <svg
      class="svg-centerer"
      v-if="region.type === 'page'"
      x="50%"
      y="50%"
    >
      <g
        class="svg-viewbox"
        :transform="
          'scale(' +
          page.camera.react.zoom +
          ') ' +
          'translate(' +
          -page.camera.react.pos.x +
          ', ' +
          -page.camera.react.pos.y +
          ')'
        "
      >
        <slot></slot>
      </g>
    </svg>

    <slot v-else></slot>
  </svg>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import type { PageRegion } from 'src/code/pages/page/regions/region';

defineProps<{
  region: PageRegion;
}>();

const page = inject<Page>('page')!;
</script>

<style scoped>
.svg-display {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  isolation: isolate;

  pointer-events: none;

  overflow: visible;
}

.svg-centerer {
  overflow: visible;
}
</style>
