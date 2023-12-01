<template>
  <q-item
    type="a"
    clickable
    :active="active"
    v-ripple
    :disable="disable"
    v-bind="{
      ...$attrs,

      onClick: (...args) => onClick(args, $attrs),
    }"
  >
    <q-item-section avatar>
      <q-circular-progress
        v-if="loading"
        indeterminate
        size="20px"
        style="margin-left: 2px"
      />

      <q-icon
        v-else
        :name="icon"
      />
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

    <slot></slot>
  </q-item>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
};

export interface MiniSidebarBtnProps extends QItemProps {
  delay?: boolean;
  active?: boolean;
  icon: string;
  tooltip: string;
  disable?: boolean;
}
</script>

<script setup lang="ts">
import { sleep } from '@stdlib/misc';
import type { QItemProps } from 'quasar';

const props = defineProps<MiniSidebarBtnProps>();

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
