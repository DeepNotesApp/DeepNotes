<template>
  <template v-if="expanded">
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
  expanded: boolean;
  tooltip: string;
  icon: string;
}>();
</script>
