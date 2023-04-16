<template>
  <q-input
    filled
    :input-style="{ color: readonly ? '#d8d8d8' : undefined }"
    :readonly="readonly"
    :model-value="modelValue"
    @update:model-value="$emit('update:model-value', $event)"
  >
    <template
      v-if="copyBtn"
      #append
    >
      <CopyBtn :text="String(modelValue)" />
    </template>
  </q-input>
</template>

<script setup lang="ts">
import type { QInputProps } from 'quasar';

interface Props extends QInputProps {
  accept?: string;
  placeholder?: string;

  modelValue: any;
  copyBtn?: boolean;
  readonly?: boolean;
}

defineProps<Props>();
</script>

<style scoped lang="scss">
.q-input :deep() {
  /* Chrome, Safari, Edge, Opera */
  input::-webkit-outer-spin-button,
  input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* Firefox */
  input[type='number'] {
    -moz-appearance: textfield;
  }
}
</style>
