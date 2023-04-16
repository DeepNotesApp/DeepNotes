<template>
  <q-input
    :type="showPassword ? 'text' : 'password'"
    filled
    label-color="grey-5"
    :model-value="modelValue"
    :autocomplete="autocomplete"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <template #append>
      <q-icon
        :name="showPassword ? 'visibility' : 'visibility_off'"
        class="cursor-pointer"
        @click="showPassword = !showPassword"
      />
    </template>

    <slot></slot>
  </q-input>
</template>

<script setup lang="ts">
import type { QInputProps } from 'quasar';

interface Props extends QInputProps {
  placeholder?: string;

  modelValue: string;
  autocomplete: 'current-password' | 'new-password';
}

defineProps<Props>();

const showPassword = ref(false);
</script>
