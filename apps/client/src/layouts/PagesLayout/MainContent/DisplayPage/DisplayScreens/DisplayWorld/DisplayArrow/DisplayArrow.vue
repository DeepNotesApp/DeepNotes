<template>
  <g
    v-if="arrow.react.valid"
    :id="`arrow-${arrow.id}`"
    class="display-arrow"
  >
    <!-- Bodies -->

    <CurveArrow
      v-if="arrow.react.collab.bodyType === 'curve'"
      @pointerdown.left.stop="onLeftPointerDown"
      @dblclick.left="onLeftDoubleClick"
    />

    <LineArrow
      v-if="arrow.react.collab.bodyType === 'line'"
      @pointerdown.left.stop="onLeftPointerDown"
      @dblclick.left="onLeftDoubleClick"
    />

    <!-- Heads -->

    <OpenHead
      v-if="arrow.react.collab.sourceHead === 'open'"
      :pos="arrow.react.sourceHeadPos"
      :angle="arrow.react.sourceAngle"
    />

    <OpenHead
      v-if="arrow.react.collab.targetHead === 'open'"
      :pos="arrow.react.targetHeadPos"
      :angle="arrow.react.targetAngle"
    />
  </g>
</template>

<script setup lang="ts">
import type { PageArrow } from 'src/code/pages/page/arrows/arrow.client';
import type { Page } from 'src/code/pages/page/page.client';

import CurveArrow from './Bodies/CurveArrow.vue';
import LineArrow from './Bodies/LineArrow.vue';
import OpenHead from './Heads/OpenHead.vue';

const props = defineProps<{
  arrow: PageArrow;
  index?: number;
}>();

const page = inject<Page>('page')!;

provide('arrow', props.arrow);

watchEffect(() => {
  // eslint-disable-next-line vue/no-mutating-props
  props.arrow.react.index = props.index ?? 0;
});

watchEffect(() => {
  if (props.arrow.react.collab == null || props.arrow.id === '') {
    return;
  }

  props.arrow.react.sourceNote?.outgoingArrowIds.add(props.arrow.id);
  props.arrow.react.targetNote?.incomingArrowIds.add(props.arrow.id);
});

function onLeftPointerDown(event: PointerEvent) {
  page.clickSelection.perform(props.arrow, event);
}

async function onLeftDoubleClick() {
  await page.editing.start(props.arrow);
}
</script>

<style scoped lang="scss">
.display-arrow :deep() {
  .arrow {
    fill: none;

    stroke-width: 4;
  }

  .arrow-hitbox {
    pointer-events: auto;

    fill: none;
    stroke: black;
    stroke-width: 20;
    stroke-opacity: 0;
  }
}
</style>
