<template>
  <component
    v-if="is != null"
    :is="is"
  >
    <slot></slot>
  </component>

  <slot v-else></slot>
</template>

<script setup lang="ts">
import type { Component } from 'vue';

defineProps<{
  is?: string | Component | object;
}>();
</script>
