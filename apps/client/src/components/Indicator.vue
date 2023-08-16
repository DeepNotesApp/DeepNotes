<template>
  <div
    style="
      position: absolute;

      width: 0;
      height: 0;
    "
    :style="{
      [`border-${indexToPos(posNum - 1)}`]: '7px solid transparent',
      [`border-${indexToPos(posNum + 1)}`]: '7px solid transparent',

      [`border-${flipPos(pos)}`]: `8px solid ${color}`,

      [flipPosBasis(posBasis)]: '50%',
      transform: `translate${posBasis === 'left' ? 'Y' : 'X'}(-50%)`,

      [pos]: '-8px',
    }"
  ></div>
</template>

<script setup lang="ts">
import type { CSSPosition } from 'src/code/utils/position';
import {
  flipPos,
  flipPosBasis,
  indexToPos,
  indexToPosBasis,
  posToIndex,
} from 'src/code/utils/position';

const props = defineProps<{
  pos: CSSPosition;
  color: string;
}>();

const posNum = computed(() => posToIndex(props.pos));
const posBasis = computed(() => indexToPosBasis(posNum.value));
</script>
