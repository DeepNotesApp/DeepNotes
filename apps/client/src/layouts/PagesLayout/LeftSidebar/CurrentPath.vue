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
    :id="`${sectionName}List`"
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
      style="padding-right: 8px"
    >
      <q-item-section side>
        <PagePopupOptions :page-id="pageId" />
      </q-item-section>
    </PageItem>
  </q-list>

  <div
    v-if="
      uiStore()[`${sectionName}Expanded`] &&
      leftSidebarSectionNames.reduce((acc, section, index) => {
        if (index > sectionIndex) {
          acc ||= uiStore()[`${section}Expanded`] ? true : false;
        }

        return acc;
      }, false)
    "
    style="position: relative"
  >
    <div
      class="resize-handle"
      @pointerdown="resizeHandlePointerDown"
      @dblclick="resizeHandleDoubleClick"
    ></div>
  </div>

  <q-separator style="background-color: rgba(255, 255, 255, 0.15) !important" />
</template>

<script setup lang="ts">
import { listenPointerEvents, map, negateProp } from '@stdlib/misc';
import PagePopupOptions from 'src/components/PagePopupOptions.vue';
import type { LeftSidebarSectionName } from 'src/stores/ui';
import {
  leftSidebarSectionIndexes,
  leftSidebarSectionNames,
} from 'src/stores/ui';
import type { ComponentPublicInstance } from 'vue';

const listRef = ref<ComponentPublicInstance>();

const sectionName = 'currentPath';
const sectionIndex = leftSidebarSectionIndexes[sectionName];

function resizeHandlePointerDown(downEvent: PointerEvent) {
  listenPointerEvents(downEvent, {
    move(moveEvent) {
      const clientRect = document
        .querySelector(`#${sectionName}List`)!
        .getBoundingClientRect();

      const othersHeight =
        uiStore().height -
        clientRect.height -
        32 * leftSidebarSectionNames.length -
        2;

      const othersWeight = leftSidebarSectionNames.reduce((acc, section) => {
        if (section !== sectionName) {
          acc += uiStore()[`${section}Expanded`]
            ? uiStore()[`${section}Weight`]
            : 0;
        }

        return acc;
      }, 0);

      const myNewHeight = moveEvent.clientY - clientRect.y;

      const myNewWeight = map(myNewHeight, 0, othersHeight, 0, othersWeight);

      const nextExpandedSection = leftSidebarSectionNames.reduce(
        (acc, section, index) => {
          if (index > sectionIndex) {
            acc ||= uiStore()[`${section}Expanded`] ? section : null;
          }

          return acc;
        },
        null as LeftSidebarSectionName | null,
      )!;

      uiStore()[`${nextExpandedSection}Weight`] -=
        myNewWeight - uiStore()[`${sectionName}Weight`];
      uiStore()[`${sectionName}Weight`] = myNewWeight;

      uiStore().normalizeWeights();
    },
  });
}

function resizeHandleDoubleClick() {
  const avgWeight =
    (uiStore()[`${sectionName}Weight`] +
      uiStore()[`${leftSidebarSectionNames[sectionIndex + 1]}Weight`]) /
    2;

  uiStore()[`${sectionName}Weight`] = avgWeight;
  uiStore()[`${leftSidebarSectionNames[sectionIndex + 1]}Weight`] = avgWeight;
}
</script>

<style scoped lang="scss">
.resize-handle {
  position: absolute;
  left: 0;
  top: -6px;
  right: 0;
  bottom: -6px;
  cursor: ns-resize;
  z-index: 2147483647;

  opacity: 0;
  background-color: white;

  transition: opacity 0.2s;
}
.resize-handle:hover {
  opacity: 0.4;
}
</style>
