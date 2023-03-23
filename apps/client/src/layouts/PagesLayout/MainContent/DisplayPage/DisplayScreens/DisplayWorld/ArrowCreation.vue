<template>
  <div
    class="arrow-creation"
    v-if="page.arrowCreation.react.active"
  >
    <SVGDisplay :region="region">
      <DisplayArrow :arrow="page.arrowCreation.fakeArrow" />
    </SVGDisplay>

    <DOMDisplay :region="region">
      <ArrowLabel :arrow="page.arrowCreation.fakeArrow" />
    </DOMDisplay>
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import type { PageRegion } from 'src/code/pages/page/regions/region';

import ArrowLabel from './DisplayArrow/ArrowLabel.vue';
import DisplayArrow from './DisplayArrow/DisplayArrow.vue';
import DOMDisplay from './DOMDisplay.vue';
import SVGDisplay from './SVGDisplay.vue';

defineProps<{
  region: PageRegion;
}>();

const page = inject<Page>('page')!;
</script>

<style scoped lang="scss">
.arrow-creation,
.arrow-creation :deep(*) {
  pointer-events: none !important;
}
</style>
