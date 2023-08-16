<template>
  <q-checkbox
    class="checkbox"
    :model-value="modelValue"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <slot></slot>
  </q-checkbox>
</template>

<script setup lang="ts">
import type { QCheckboxProps } from 'quasar';

interface Props extends QCheckboxProps {
  modelValue: boolean;
}

defineProps<Props>();
</script>

<style scoped>
.checkbox {
  flex: 1;

  margin-left: -10px;
  margin-top: -10px;
  margin-bottom: -10px;
}
</style>
