<template>
  <template v-if="region.type === 'page'">
    <!-- Centralizer -->

    <div class="dom-centralizer">
      <!-- Viewbox -->

      <div
        class="dom-viewbox"
        :style="{
          transform:
            `scale(${page.camera.react.zoom}) ` +
            `translate(${-page.camera.react.pos.x}px, ${-page.camera.react.pos
              .y}px)`,
        }"
        v-bind="$attrs"
      >
        <slot></slot>
      </div>
    </div>
  </template>

  <div
    v-else
    style="
      pointer-events: auto;
      width: 0;
      height: 0;

      isolation: isolate;
    "
    v-bind="$attrs"
  >
    <slot></slot>
  </div>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import type { PageRegion } from 'src/code/pages/page/regions/region';

defineProps<{
  region: PageRegion;
}>();

const page = inject<Page>('page')!;
</script>

<style scoped>
.dom-centralizer {
  position: absolute;

  left: 50%;
  top: 50%;
}

.dom-viewbox {
  position: relative;

  width: 0;
  height: 0;

  pointer-events: auto;

  isolation: isolate;
}
</style>
