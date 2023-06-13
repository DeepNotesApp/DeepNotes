<template>
  <q-drawer
    :mini="!uiStore().rightSidebarExpanded"
    :model-value="uiStore().rightSidebarExpanded || uiStore().width > 800"
    side="right"
    bordered
    no-swipe-open
    no-swipe-close
    no-swipe-backdrop
    behavior="desktop"
    style="
      display: flex;
      flex-direction: column;
      background-color: rgb(33, 33, 33);
      min-width: 299px;
      max-width: 299px;
    "
  >
    <q-toolbar style="padding: 0; flex: none; background-color: #141414">
      <q-avatar style="margin-left: 9px">
        <q-icon
          name="mdi-chart-box"
          size="26px"
        />
      </q-avatar>

      <q-toolbar-title
        v-if="uiStore().rightSidebarExpanded"
        style="
          margin-left: -2px;
          text-align: left;
          color: rgba(255, 255, 255, 0.85);
          font-size: 15.2px;
        "
      >
        <template v-if="page.activeElem.react.value?.type === 'note'">
          Note properties
        </template>
        <template v-else-if="page.activeElem.react.value?.type === 'arrow'">
          Arrow properties
        </template>
        <template v-else> Page properties </template>
      </q-toolbar-title>
    </q-toolbar>

    <div style="overflow-y: auto; height: 0; flex: 1">
      <NoteProperties v-if="page.activeElem.react.value?.type === 'note'" />
      <ArrowProperties
        v-else-if="page.activeElem.react.value?.type === 'arrow'"
      />
      <PageProperties v-else />
    </div>
  </q-drawer>
</template>

<script setup lang="ts">
import ArrowProperties from './ArrowProperties.vue';
import NoteProperties from './NoteProperties/NoteProperties.vue';
import PageProperties from './PageProperties/PageProperties.vue';

const page = computed(() => internals.pages.react.page);

provide('page', page);
</script>

<style scoped lang="scss">
.q-drawer-container :deep() {
  .q-drawer {
    border-left: 1px solid rgba(255, 255, 255, 0.12) !important;
  }
}
</style>
