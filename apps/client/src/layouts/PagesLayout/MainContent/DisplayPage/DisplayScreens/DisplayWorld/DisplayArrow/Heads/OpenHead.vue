<template>
  <polyline
    :stroke="arrow.react.color.final"
    :points="`${pos.x - ARROW_SIZE},${pos.y - ARROW_SIZE} ${pos.x},${pos.y} ${
      pos.x - ARROW_SIZE
    },${pos.y + ARROW_SIZE}`"
    :transform="`rotate(${(angle / Math.PI) * 180},${pos.x},${pos.y})`"
    class="arrow"
  />
</template>

<script setup lang="ts">
import type { Vec2 } from '@stdlib/misc';
import type { PageArrow } from 'src/code/pages/page/arrows/arrow.client';

defineProps<{
  pos: Vec2;
  angle: number;
}>();

const ARROW_SIZE = 10;

const arrow = inject<PageArrow>('arrow')!;
</script>
