<template>
  <q-radio
    class="radio"
    :label="label"
    :model-value="modelValue"
    @update:model-value="$emit('update:model-value', $event)"
    :disable="disable"
    :val="val"
  />
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  modelValue?: string | number | null;
  val?: string | number | null;
  disable?: boolean;
}>();
</script>

<style scoped>
.radio {
  flex: none;

  margin-left: -10px;
  margin-top: -10px;
  margin-bottom: -10px;
}
</style>
