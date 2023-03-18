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
  const absDiff = arrow.react.targetHeadPos
    .sub(arrow.react.sourceHeadPos)
    .abs();

  const minAbsDiff = Math.min(absDiff.x, absDiff.y);
  const totalAbsDiff = absDiff.x + absDiff.y;

  const normalDiff = arrow.react.normals.target.sub(
    arrow.react.normals.source.mulScalar(-1),
  );
  const facingNormals = normalDiff.x === 0 && normalDiff.y === 0;

  let sourceControlOffset;
  let targetControlOffset;

  if (facingNormals) {
    const arrowNormal = arrow.react.targetHeadPos
      .sub(arrow.react.sourceHeadPos)
      .normal();

    const sourceCosine = arrow.react.normals.source.cosineTo(arrowNormal);
    const targetCosine = arrow.react.normals.target.cosineTo(
      arrowNormal.mulScalar(-1),
    );

    sourceControlOffset =
      sourceCosine > 0.785 ? minAbsDiff : Math.max(100, minAbsDiff);
    targetControlOffset =
      targetCosine > 0.785 ? minAbsDiff : Math.max(100, minAbsDiff);
  } else {
    const controlOffset = totalAbsDiff * 0.3;

    sourceControlOffset = controlOffset;
    targetControlOffset = controlOffset;
  }

  const sourceControl =
    arrow.react.normals.source.mulScalar(sourceControlOffset);
  const targetControl =
    arrow.react.normals.target.mulScalar(targetControlOffset);

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
