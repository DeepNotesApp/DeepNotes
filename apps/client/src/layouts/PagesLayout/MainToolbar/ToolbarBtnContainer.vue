<template>
  <template v-if="toolbarWidth >= breakpoint">
    <slot></slot>
  </template>

  <ToolbarBtn
    v-else
    :tooltip="tooltip"
    :icon="icon"
    icon-size="24px"
  >
    <q-menu
      style="padding: 0px 4px"
      :offset="[0, 4]"
      auto-close
    >
      <slot popup></slot>
    </q-menu>
  </ToolbarBtn>
</template>

<script setup lang="ts">
defineProps<{
  toolbarWidth: number;
  breakpoint: number;
  tooltip: string;
  icon: string;
}>();
</script>
