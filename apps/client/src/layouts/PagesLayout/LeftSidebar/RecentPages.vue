<template>
  <q-toolbar style="padding: 0; background-color: #141414">
    <DeepBtn
      flat
      style="width: 100%; height: 50px; border-radius: 0"
      no-caps
      @click="negateProp(uiStore(), 'recentPagesExpanded')"
    >
      <div style="width: 100%; display: flex; align-items: center">
        <q-avatar style="margin-left: -8px">
          <q-icon
            name="mdi-history"
            size="31px"
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
          Recent pages
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
        <div style="font-weight: bold; font-size: 14px">Recent pages</div>
      </q-tooltip>
    </DeepBtn>
  </q-toolbar>

  <q-list
    style="
      height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      transition: all 0.2s;
    "
    :style="{ flex: uiStore().recentPagesExpanded ? '1' : '0' }"
  >
    <div
      v-for="pageId in internals.pages.react.recentPageIds"
      :key="pageId"
      class="recent-page"
    >
      <PageItem
        icon
        :page-id="pageId"
        :active="pageId === internals.pages.react.pageId"
        prefer="absolute"
        class="recent-pages"
      />

      <DeepBtn
        icon="mdi-close"
        size="14px"
        round
        flat
        class="remove-btn"
        @click.stop="removeRecentPage(pageId)"
      />
    </div>
  </q-list>
</template>

<script setup lang="ts">
import { negateProp } from '@stdlib/misc';
import { pull } from 'lodash';
import { handleError } from 'src/code/utils/misc';

async function removeRecentPage(pageId: string) {
  try {
    await trpcClient.users.pages.removeRecentPage.mutate({ pageId });

    pull(internals.pages.react.recentPageIds, pageId);
  } catch (error) {
    handleError(error);
  }
}
</script>

<style scoped lang="scss">
.recent-page {
  position: relative;

  > .remove-btn {
    position: absolute;

    top: 50%;
    right: -6px;

    transform: translate(-50%, -50%);

    min-width: 30px;
    min-height: 30px;
    width: 30px;
    height: 30px;

    opacity: 0;
    transition: opacity 0.2s;
  }
}

.recent-page:hover > .remove-btn {
  opacity: 1;
}
</style>
