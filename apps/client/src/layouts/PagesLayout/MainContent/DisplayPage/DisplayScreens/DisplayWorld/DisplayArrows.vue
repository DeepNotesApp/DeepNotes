<template>
  <!-- Arrows -->

  <SVGDisplay :region="region">
    <template
      v-for="(arrow, index) in region.react.arrows"
      :key="arrow.id"
    >
      <DisplayArrow
        v-if="!arrow.react.interregional"
        :arrow="arrow"
        :index="index"
      />
    </template>
  </SVGDisplay>

  <!-- Arrow labels -->

  <DOMDisplay :region="region">
    <template
      v-for="arrow in region.react.arrows"
      :key="arrow.id"
    >
      <ArrowLabel
        v-if="!arrow.react.interregional"
        :arrow="arrow"
      />
    </template>
  </DOMDisplay>
</template>

<script setup lang="ts">
import type { PageRegion } from 'src/code/pages/page/regions/region.client';

import ArrowLabel from './DisplayArrow/ArrowLabel.vue';
import DisplayArrow from './DisplayArrow/DisplayArrow.vue';
import DOMDisplay from './DOMDisplay.vue';
import SVGDisplay from './SVGDisplay.vue';

const props = defineProps<{
  region: PageRegion;
}>();

provide('region', props.region);
</script>
