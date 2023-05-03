<template>
  <q-toolbar style="padding: 0; background-color: #141414">
    <DeepBtn
      flat
      style="width: 100%; height: 50px; border-radius: 0"
      no-caps
      @click="negateProp(uiStore(), 'currentPathExpanded')"
    >
      <div style="width: 100%; display: flex; align-items: center">
        <q-avatar style="margin-left: -8px">
          <q-icon
            name="mdi-map-marker-radius"
            size="32px"
          />
        </q-avatar>

        <q-toolbar-title
          style="
            margin-left: 12px;
            text-align: left;
            color: rgba(255, 255, 255, 0.85);
            font-size: 18px;
          "
        >
          Current path
        </q-toolbar-title>
      </div>

      <q-tooltip
        v-if="!uiStore().leftSidebarExpanded"
        anchor="center right"
        self="center left"
        max-width="200px"
        transition-show="jump-right"
        transition-hide="jump-left"
      >
        <div style="font-weight: bold; font-size: 14px">Current path</div>
      </q-tooltip>
    </DeepBtn>
  </q-toolbar>

  <q-list
    :class="{
      mini: !uiStore().leftSidebarExpanded,
    }"
    style="
      height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      transition: all 0.2s;
    "
    :style="{ flex: uiStore().currentPathExpanded ? '1' : '0' }"
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
</template>

<script setup lang="ts">
import { negateProp } from '@stdlib/misc';
</script>
