<template>
  <div class="loading-overlay">
    <div
      style="position: absolute; inset: 0"
      :style="frameStyle"
    >
      <q-circular-progress
        indeterminate
        size="lg"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { StyleValue } from 'vue';

defineProps<{
  frameStyle?: StyleValue;
}>();
</script>

<style scoped>
.loading-overlay {
  position: absolute;

  left: 0;
  top: 0;
  right: 0;
  bottom: 0;

  background-color: #181818;

  z-index: 2147483646;

  pointer-events: none;
}

.q-circular-progress {
  transform: translate(-50%, -50%);

  left: 50%;
  top: 50%;
}
</style>
