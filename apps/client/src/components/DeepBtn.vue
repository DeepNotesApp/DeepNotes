<template>
  <q-btn
    :loading="loading"
    v-bind="{
      ...$attrs,

      onClick: (...args) => onClick(args, $attrs),
    }"
  >
    <slot></slot>
  </q-btn>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};
</script>

<script setup lang="ts">
import { sleep } from '@stdlib/misc';
import type { QBtnProps } from 'quasar';

interface Props extends QBtnProps {
  delay?: boolean;
}

const props = defineProps<Props>();

const loading = ref(false);

async function onClick(args: any[], attrs: any) {
  if (attrs.onClick == null) {
    return;
  }

  args[0].preventDefault();

  loading.value = true;

  if (props.delay) {
    await sleep(500);
  }

  try {
    await attrs.onClick(...args);
  } catch (error) {
    mainLogger.error(error);
  }

  loading.value = false;
}
</script>

<style scoped>
.q-btn:not(.q-btn--round) {
  border-radius: 6px;
}

.q-btn.bg-secondary {
  background-color: transparent !important;

  border: 1px solid rgb(255, 255, 255, 0.25);
}

.q-btn.bg-negative {
  background-color: transparent !important;

  border: 1px solid rgb(110, 54, 48);

  color: rgb(235, 87, 87) !important;
}
</style>

<style>
.q-btn {
  text-transform: none;
}
</style>
