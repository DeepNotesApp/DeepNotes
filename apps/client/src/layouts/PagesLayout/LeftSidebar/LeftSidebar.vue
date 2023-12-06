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
      class="resize-handle"
      @pointerdown="resizeLeftSidebar"
      @dblclick="() => uiStore().resetLeftSidebarWidth()"
    ></div>

    <CurrentPath />

    <RecentPages />

    <SelectedPages />
  </q-drawer>
</template>

<script setup lang="ts">
import { listenPointerEvents } from '@stdlib/misc';

import CurrentPath from './CurrentPath.vue';
import RecentPages from './RecentPages.vue';
import SelectedPages from './SelectedPages.vue';

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
    border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
  }
}

.resize-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -10px;
  left: calc(100% + 1px);
  cursor: ew-resize;
  z-index: 2147483647;

  opacity: 0;
  background-color: white;

  transition: opacity 0.2s;
}
.resize-handle:hover {
  opacity: 0.4;
}
</style>
