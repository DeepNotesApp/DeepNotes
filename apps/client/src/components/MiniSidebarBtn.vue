<template>
  <q-item
    type="a"
    clickable
    :active="active"
    v-ripple
    :disable="disable"
  >
    <q-item-section avatar>
      <q-icon :name="icon" />
    </q-item-section>

    <q-tooltip
      anchor="center left"
      self="center right"
      :offset="[10, 10]"
      max-width="200px"
      transition-show="jump-left"
      transition-hide="jump-right"
    >
      {{ tooltip }}
    </q-tooltip>
  </q-item>
</template>

<script setup lang="ts">
defineProps<{
  active?: boolean;
  icon: string;
  tooltip: string;
  disable?: boolean;
}>();
</script>
