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
import { lerp, Vec2 } from '@stdlib/misc';
import type { PageArrow } from 'src/code/pages/page/arrows/arrow';

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
  const diff = arrow.react.targetHeadPos.sub(arrow.react.sourceHeadPos);

  const targetDirection = arrow.react.targetHeadPos
    .sub(arrow.react.sourceHeadPos)
    .normal();
  const sourceDirection = targetDirection.mulScalar(-1);

  const sourceCosine = arrow.react.normals.source.cosineTo(targetDirection);
  const targetCosine = arrow.react.normals.target.cosineTo(sourceDirection);

  let sourceDot = arrow.react.normals.source.dot(diff);
  let targetDot = -arrow.react.normals.target.dot(diff);

  const minDot = 50;
  const dotMultiplier = 0.6;

  const modifiedSourceDot =
    sourceDot > minDot
      ? sourceDot
      : minDot - (sourceDot - minDot) * dotMultiplier;
  const modifiedTargetDot =
    targetDot > minDot
      ? targetDot
      : minDot - (targetDot - minDot) * dotMultiplier;

  const sourceControlOffset = lerp(
    modifiedSourceDot * 0.75,
    Math.abs(sourceDot) * 0.5,
    (Math.max(0.785, sourceCosine) - 0.785) / (1 - 0.785),
  );
  const targetControlOffset = lerp(
    modifiedTargetDot * 0.75,
    Math.abs(targetDot) * 0.5,
    (Math.max(0.785, targetCosine) - 0.785) / (1 - 0.785),
  );

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
