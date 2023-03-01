<template>
  <path
    ref="bodyElem"
    class="arrow"
    :stroke="arrow.react.color.final"
    :d="getPathDefinition()"
    :stroke-dasharray="
      arrow.react.collab.bodyStyle === 'dashed' ? '6,6' : undefined
    "
  />

  <path
    class="arrow-hitbox"
    :d="getPathDefinition()"
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

function getPathDefinition() {
  const controlOffset =
    (Math.abs((arrow.react.targetHeadPos.x - arrow.react.sourceHeadPos.x) / 2) +
      Math.abs(
        (arrow.react.targetHeadPos.y - arrow.react.sourceHeadPos.y) / 2,
      )) *
    0.75;

  const sourceControl = arrow.react.normals.source.mulScalar(controlOffset);
  const targetControl = arrow.react.normals.target.mulScalar(controlOffset);

  return `M ${arrow.react.sourceHeadPos.x}, ${arrow.react.sourceHeadPos.y}
        C ${arrow.react.sourceHeadPos.x + sourceControl.x}, ${
    arrow.react.sourceHeadPos.y + sourceControl.y
  },
        ${arrow.react.targetHeadPos.x + targetControl.x}, ${
    arrow.react.targetHeadPos.y + targetControl.y
  },
        ${arrow.react.targetHeadPos.x}, ${arrow.react.targetHeadPos.y}`;
}
</script>
