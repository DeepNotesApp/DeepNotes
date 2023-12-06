<template>
  <q-toolbar
    style="
      padding: 0;
      background-color: #141414;
      min-height: 0;
      overflow: hidden;
    "
  >
    <DeepBtn
      flat
      style="width: 100%; height: 32px; min-height: 0; border-radius: 0"
      no-caps
      @click="negateProp(uiStore(), 'currentPathExpanded')"
    >
      <div style="width: 100%; height: 0; display: flex; align-items: center">
        <q-avatar style="margin-top: -1px; margin-left: -8px">
          <q-icon
            name="mdi-map-marker-radius"
            size="20px"
          />
        </q-avatar>

        <q-toolbar-title
          style="
            margin-left: -2px;
            text-align: left;
            color: rgba(255, 255, 255, 0.85);
            font-size: 13.5px;
          "
        >
          Current path
        </q-toolbar-title>
      </div>
    </DeepBtn>
  </q-toolbar>

  <q-list
    ref="listRef"
    style="height: 0; overflow-x: hidden; overflow-y: auto"
    :style="{
      flex: uiStore().currentPathExpanded ? uiStore().currentPathWeight : '0',
    }"
  >
    <PageItem
      v-for="pageId in internals.pages.react.pathPageIds"
      :key="pageId"
      icon
      :page-id="pageId"
      :active="pageId === internals.pages.react.pageId"
      prefer="relative"
      class="current-path"
    />
  </q-list>

  <div
    v-if="
      uiStore().currentPathExpanded &&
      (uiStore().recentPagesExpanded || uiStore().selectedPagesExpanded)
    "
    style="position: relative"
  >
    <div
      style="
        position: absolute;
        left: 0;
        top: -12px;
        right: 0;
        bottom: -12px;
        cursor: ns-resize;
        z-index: 2147483647;
      "
      @pointerdown="resizeSection"
    ></div>
  </div>

  <q-separator style="background-color: rgba(255, 255, 255, 0.15) !important" />
</template>

<script setup lang="ts">
import { listenPointerEvents, map, negateProp } from '@stdlib/misc';
import type { ComponentPublicInstance } from 'vue';

const listRef = ref<ComponentPublicInstance>();

function resizeSection(downEvent: PointerEvent) {
  listenPointerEvents(downEvent, {
    move(moveEvent) {
      const clientRect = listRef.value!.$el.getBoundingClientRect();

      const othersHeight = uiStore().height - clientRect.height - 32 * 3 - 2;

      const othersWeight =
        (uiStore().recentPagesExpanded ? uiStore().recentPagesWeight : 0) +
        (uiStore().selectedPagesExpanded ? uiStore().selectedPagesWeight : 0);

      const myNewHeight = moveEvent.clientY - clientRect.y;

      const myNewWeight = map(myNewHeight, 0, othersHeight, 0, othersWeight);

      uiStore().recentPagesWeight -= myNewWeight - uiStore().currentPathWeight;
      uiStore().currentPathWeight = myNewWeight;

      uiStore().normalizeWeights();
    },
  });
}
</script>
