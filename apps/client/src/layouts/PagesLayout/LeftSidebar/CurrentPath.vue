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
