<template>
  <svg
    v-if="page.arrowCreation.react.active"
    class="arrow-link-zones"
    width="100%"
    height="100%"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
  >
    <ArrowLinkZone
      points="0,0 100,0 75,25 25,25"
      :anchor="{ x: 0, y: -1 }"
    ></ArrowLinkZone>

    <ArrowLinkZone
      points="0,0 25,25 25,75 0,100"
      :anchor="{ x: -1, y: 0 }"
    ></ArrowLinkZone>

    <ArrowLinkZone
      points="0,100 25,75 75,75 100,100"
      :anchor="{ x: 0, y: 1 }"
    ></ArrowLinkZone>

    <ArrowLinkZone
      points="100,100 75,75 75,25 100,0"
      :anchor="{ x: 1, y: 0 }"
    ></ArrowLinkZone>

    <ArrowLinkZone
      points="25,25 75,25 75,75 25,75"
      :anchor="null"
    ></ArrowLinkZone>
  </svg>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';

import ArrowLinkZone from './ArrowLinkZone.vue';

const page = inject<Page>('page')!;
</script>

<style scoped lang="scss">
.arrow-link-zones {
  position: absolute;

  inset: 0;

  overflow: visible;
}
</style>
