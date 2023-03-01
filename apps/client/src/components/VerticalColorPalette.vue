<template>
  <div style="cursor: pointer; display: flex">
    <div style="flex: 1">
      <ColorSquare
        v-for="color in colorNames().filter((_, index) => index < 5)"
        :key="color"
        :type="type"
        :color="color"
        :disable="disable"
        @select="$emit('select', $event)"
      />
    </div>

    <div style="flex: 1">
      <ColorSquare
        v-for="color in colorNames().filter((_, index) => index >= 5)"
        :key="color"
        :type="type"
        :color="color"
        :disable="disable"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { colorNames } from 'src/code/pages/colors.client';

import ColorSquare from './ColorSquare.vue';

defineEmits(['select']);

defineProps<{
  type: 'arrows' | 'notes';
  disable?: boolean;
}>();
</script>
