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

    <q-tooltip
      v-if="tooltip != null"
      anchor="top middle"
      self="bottom middle"
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      {{ tooltip }}
    </q-tooltip>
  </DeepBtn>
</template>

<script setup lang="ts">
defineProps<{
  icon: string;
  tooltip?: string;
}>();
</script>
