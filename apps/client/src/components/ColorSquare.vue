<template>
  <div
    class="color-square"
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
import type { ColorName } from 'src/code/pages/colors';
import { colorMap } from 'src/code/pages/colors';

defineEmits(['select']);

defineProps<{
  type: 'notes' | 'arrows';
  color: ColorName;
  disable?: boolean;
}>();
</script>

<style scoped>
.color-square {
  flex: 1;

  aspect-ratio: 1 / 1;

  width: 100%;
  height: 100%;
}
</style>
