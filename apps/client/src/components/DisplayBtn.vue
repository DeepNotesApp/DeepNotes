<template>
  <DeepBtn
    style="
      min-width: 36px;
      min-height: 38px;

      padding: 0;

      pointer-events: auto;
    "
    :icon="icon"
    color="grey-9"
    dense
  >
    <slot></slot>
  </DeepBtn>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
}>();
</script>
