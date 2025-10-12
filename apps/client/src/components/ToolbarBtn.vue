<template>
  <q-btn
    type="a"
    dense
    flat
    :round="round"
    style="padding: 0; margin: 4px 0px"
    :style="{
      'min-width': round ? undefined : (btnSize ?? '28px'),
      height: btnSize ?? '28px',
      width: btnSize ?? '28px',
    }"
  >
    <q-icon
      :size="iconSize ?? '19px'"
      :name="icon"
    />

    <slot></slot>

    <q-tooltip
      v-if="tooltip != null"
      anchor="bottom middle"
      self="top middle"
      :offset="[10, 10]"
      style="text-align: center"
    >
      <div
        v-for="(line, index) in tooltip.split('\n')"
        :key="index"
      >
        {{ line }}
      </div>
    </q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
import type { QBtnProps } from 'quasar';

interface Props extends QBtnProps {
  icon: string;
  tooltip?: string;
  iconSize?: string;
  btnSize?: string;
  round?: boolean;
}

defineProps<Props>();
</script>
