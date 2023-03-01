<template>
  <line
    ref="bodyElem"
    class="arrow"
    :stroke="arrow.react.color.final"
    :x1="arrow.react.sourceHeadPos.x"
    :y1="arrow.react.sourceHeadPos.y"
    :x2="arrow.react.targetHeadPos.x"
    :y2="arrow.react.targetHeadPos.y"
    :stroke-dasharray="
      arrow.react.collab.bodyStyle === 'dashed' ? '6,6' : undefined
    "
  />

  <line
    class="arrow-hitbox"
    :x1="arrow.react.sourceHeadPos.x"
    :y1="arrow.react.sourceHeadPos.y"
    :x2="arrow.react.targetHeadPos.x"
    :y2="arrow.react.targetHeadPos.y"
    v-bind="$attrs"
  />
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import { Vec2 } from '@stdlib/misc';
import type { PageArrow } from 'src/code/pages/page/arrows/arrow.client';

const arrow = inject<PageArrow>('arrow')!;

const bodyElem = ref<SVGPathElement>();

watchEffect(async () => {
  if (!arrow.react.valid) {
    return;
  }

  arrow.react.sourceHeadPos;
  arrow.react.targetHeadPos;

  await nextTick();

  if (bodyElem.value == null) {
    return;
  }

  arrow.react.centerPos = new Vec2(
    bodyElem.value.getPointAtLength(bodyElem.value.getTotalLength() / 2),
  );
});
</script>
