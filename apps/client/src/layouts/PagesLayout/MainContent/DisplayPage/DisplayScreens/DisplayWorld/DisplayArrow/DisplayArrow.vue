<template>
  <g
    v-if="arrow.react.valid"
    :id="`arrow-${arrow.id}`"
    class="display-arrow"
  >
    <!-- Bodies -->

    <component
      :is="arrow.react.collab.bodyType === 'curve' ? CurveArrow : LineArrow"
      :style="{
        'pointer-events': page.arrowCreation.react.active ? 'none' : undefined,
      }"
      @pointerdown.left.stop="onLeftPointerDown"
      @click.left="onLeftClick"
    ></component>

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
import {
  getClosestPathPointPercent,
  listenPointerEvents,
  Vec2,
} from '@stdlib/misc';
import type { PageArrow } from 'src/code/pages/page/arrows/arrow';
import type { Page } from 'src/code/pages/page/page';
import { createDoubleClickChecker } from 'src/code/utils/misc';

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

  const path = document.querySelector(
    `#arrow-${props.arrow.id} .arrow`,
  ) as SVGPathElement;

  if (path != null) {
    const absoluteWorldPos = page.pos.clientToWorld(
      new Vec2(event.clientX, event.clientY),
    );

    const originWorldPos = props.arrow.react.interregional
      ? props.arrow.react.region.react.islandRoot.getOriginWorldPos()
      : props.arrow.react.region.getOriginWorldPos();

    if (originWorldPos == null) {
      return;
    }

    const relativeWorldPos = absoluteWorldPos.sub(originWorldPos);

    if (getClosestPathPointPercent(path, relativeWorldPos) < 0.5) {
      listenPointerEvents(event, {
        dragStartDistance: 5,

        dragStart() {
          page.arrowCreation.start({
            anchorNote: props.arrow.react.targetNote,
            looseEndpoint: 'source',
            baseArrow: props.arrow,
            event,
          });

          props.arrow.delete();
        },
      });
    } else {
      listenPointerEvents(event, {
        dragStartDistance: 5,

        dragStart() {
          page.arrowCreation.start({
            anchorNote: props.arrow.react.sourceNote,
            looseEndpoint: 'target',
            baseArrow: props.arrow,
            event,
          });

          props.arrow.delete();
        },
      });
    }
  }
}

const checkDoubleClick = createDoubleClickChecker();

async function onLeftClick(event: MouseEvent) {
  if (checkDoubleClick(event)) {
    await page.editing.start(props.arrow);
  }
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
