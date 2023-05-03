<template>
  <div
    style="cursor: pointer; display: flex; border-radius: 4px; overflow: hidden"
    :style="{
      'flex-direction': orientation === 'horizontal' ? 'column' : 'row',
    }"
  >
    <div
      v-for="groupIndex in numGroups"
      :key="groupIndex"
      style="flex: 1; display: flex"
      :style="{
        'flex-direction': orientation === 'horizontal' ? 'row' : 'column',
      }"
    >
      <ColorSquare
        v-for="cellIndex in groupLength"
        :key="cellIndex"
        :type="type"
        :color="colorNames()[(groupIndex - 1) * groupLength + cellIndex - 1]"
        :disable="disable"
        @select="$emit('select', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { colorNames } from 'src/code/pages/colors';

import ColorSquare from './ColorSquare.vue';

defineEmits(['select']);

const props = defineProps<{
  type: 'arrows' | 'notes';
  orientation: 'horizontal' | 'vertical';
  split?: number;
  disable?: boolean;
}>();

const groupLength = Math.ceil(colorNames().length / (props.split ?? 1));
const numGroups = Math.ceil(colorNames().length / groupLength);
</script>
