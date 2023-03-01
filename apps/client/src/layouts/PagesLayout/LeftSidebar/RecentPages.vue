<template>
  <q-toolbar style="padding: 0; background-color: #141414">
    <DeepBtn
      flat
      style="width: 100%; height: 50px; border-radius: 0"
      no-caps
      @click="
        () => {
          uiStore().recentPagesExpanded = !uiStore().recentPagesExpanded;

          internals.localStorage.setItem(
            'recentPagesExpanded',
            uiStore().recentPagesExpanded.toString(),
          );
        }
      "
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
    <SidebarPage
      v-for="pageId in internals.pages.react.recentPageIds"
      :key="pageId"
      group="recent-pages"
      :page-id="pageId"
      prefer="absolute"
    >
      <template #side>
        <DeepBtn
          icon="mdi-close"
          round
          flat
          style="min-width: 32px; min-height: 32px; width: 32px; height: 32px"
          @click.stop="removeRecentPage(pageId)"
        />
      </template>
    </SidebarPage>
  </q-list>
</template>

<script setup lang="ts">
import { pull } from 'lodash';
import { handleError } from 'src/code/utils.client';

async function removeRecentPage(pageId: string) {
  try {
    await api().post(`/api/users/remove-recent-page/${pageId}`);

    pull(internals.pages.react.recentPageIds, pageId);
  } catch (error) {
    handleError(error);
  }
}
</script>
