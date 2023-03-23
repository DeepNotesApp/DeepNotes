<template>
  <template v-if="region.react.islandRoot === region">
    <SVGDisplay :region="region">
      <template
        v-for="(arrow, index) in Array.from(region.react.islandRegions.values())
          .map((region) => region.react.arrows)
          .flat()
          .filter((arrow) => arrow.react.interregional)"
        :key="arrow.id"
      >
        <DisplayArrow
          :arrow="arrow"
          :index="index"
        />
      </template>
    </SVGDisplay>

    <DOMDisplay :region="region">
      <template
        v-for="arrow in Array.from(region.react.islandRegions.values())
          .map((region) => region.react.arrows)
          .flat()
          .filter((arrow) => arrow.react.interregional)"
        :key="arrow.id"
      >
        <ArrowLabel :arrow="arrow" />
      </template>
    </DOMDisplay>
  </template>
</template>

<script setup lang="ts">
import type { PageRegion } from 'src/code/pages/page/regions/region';

import ArrowLabel from './DisplayArrow/ArrowLabel.vue';
import DisplayArrow from './DisplayArrow/DisplayArrow.vue';
import DOMDisplay from './DOMDisplay.vue';
import SVGDisplay from './SVGDisplay.vue';

defineProps<{
  region: PageRegion;
}>();
</script>
