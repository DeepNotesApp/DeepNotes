<template>
  <div
    style="flex: 1; aspect-ratio: 1 / 1"
    :style="{
      'background-color': colorMap()['ui'][color],
    }"
    @click="
      () => {
        if (!disable) {
          $emit('select', color);
        }
      }
    "
  ></div>
</template>

<script setup lang="ts">
import type { ColorName } from 'src/code/pages/colors.client';
import { colorMap } from 'src/code/pages/colors.client';

defineEmits(['select']);

defineProps<{
  type: 'notes' | 'arrows';
  color: ColorName;
  disable?: boolean;
}>();
</script>
