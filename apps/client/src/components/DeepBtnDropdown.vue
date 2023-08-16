<template>
  <q-btn-dropdown
    :loading="loading"
    v-bind="{
      ...$attrs,

      onClick: (...args) => onClick(args, $attrs),
    }"
  >
    <slot></slot>

    <template #label>
      <slot name="label"></slot>
    </template>
  </q-btn-dropdown>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};

export interface DeepBtnProps extends QBtnDropdownProps {
  delay?: boolean;
}
</script>

<script setup lang="ts">
import { sleep } from '@stdlib/misc';
import type { QBtnDropdownProps } from 'quasar';

const props = defineProps<DeepBtnProps>();

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
