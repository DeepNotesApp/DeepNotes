<template>
  <q-drawer
    :mini="!uiStore().leftSidebarExpanded"
    :model-value="uiStore().leftSidebarExpanded || uiStore().width > 800"
    side="left"
    bordered
    no-swipe-open
    no-swipe-close
    no-swipe-backdrop
    behavior="desktop"
    :width="260"
    style="
      display: flex;
      flex-direction: column;
      background-color: #212121;
      min-width: 259px;
      max-width: 259px;
    "
  >
    <CurrentPath />

    <q-separator
      style="background-color: rgba(255, 255, 255, 0.15) !important"
    />

    <RecentPages />
  </q-drawer>
</template>

<script setup lang="ts">
import CurrentPath from 'src/layouts/PagesLayout/LeftSidebar/CurrentPath.vue';

import RecentPages from './RecentPages.vue';
</script>

<style scoped lang="scss">
.q-drawer-container :deep() {
  .q-drawer {
    position: fixed;

    border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
  }
}
</style>
