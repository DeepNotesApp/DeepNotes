<template>
  <q-drawer
    :model-value="uiStore().leftSidebarExpanded"
    side="left"
    bordered
    no-swipe-open
    no-swipe-close
    no-swipe-backdrop
    behavior="desktop"
    :width="uiStore().leftSidebarWidth"
    style="display: flex; flex-direction: column; background-color: #212121"
  >
    <div
      style="
        position: absolute;
        top: 0;
        bottom: 0;
        right: -12px;
        width: 12px;
        cursor: ew-resize;
        z-index: 2147483647;
      "
      @pointerdown="resizeLeftSidebar"
      @dblclick="() => uiStore().resetLeftSidebarWidth()"
    ></div>

    <CurrentPath />

    <q-separator
      style="background-color: rgba(255, 255, 255, 0.15) !important"
    />

    <RecentPages />
  </q-drawer>
</template>

<script setup lang="ts">
import { listenPointerEvents } from '@stdlib/misc';
import CurrentPath from 'src/layouts/PagesLayout/LeftSidebar/CurrentPath.vue';

import RecentPages from './RecentPages.vue';

function resizeLeftSidebar(event: PointerEvent) {
  listenPointerEvents(event, {
    move(event) {
      uiStore().leftSidebarWidth = event.clientX;
    },
  });
}
</script>

<style scoped lang="scss">
.q-drawer-container :deep() {
  .q-drawer {
    position: fixed;

    border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
  }
}
</style>
