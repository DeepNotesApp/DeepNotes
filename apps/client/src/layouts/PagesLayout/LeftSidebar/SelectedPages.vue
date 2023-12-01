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
      @click="negateProp(uiStore(), 'selectedPagesExpanded')"
    >
      <div style="width: 100%; height: 0; display: flex; align-items: center">
        <q-avatar style="margin-top: -1px; margin-left: -8px">
          <q-icon
            name="mdi-selection-multiple"
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
          Selected pages
        </q-toolbar-title>
      </div>
    </DeepBtn>

    <q-btn
      icon="mdi-menu"
      style="
        position: absolute;
        right: 4px;
        width: 32px;
        height: 32px;
        min-height: 0;
      "
    >
      <q-menu auto-close>
        <q-list>
          <q-item
            clickable
            @click="movePages"
            :disable="pageSelectionStore().selectedPages.size === 0"
          >
            <q-item-section avatar>
              <q-icon name="mdi-file-move" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Move selection</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            @click="deletePages"
            :disable="pageSelectionStore().selectedPages.size === 0"
          >
            <q-item-section avatar>
              <q-icon name="mdi-trash-can" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Delete selection</q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            @click="pageSelectionStore().selectedPages.clear()"
            :disable="pageSelectionStore().selectedPages.size === 0"
          >
            <q-item-section avatar>
              <q-icon name="mdi-selection-remove" />
            </q-item-section>

            <q-item-section>
              <q-item-label>Clear selection</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>
  </q-toolbar>

  <q-list
    style="
      height: 0;
      overflow-x: hidden;
      overflow-y: auto;
      transition: all 0.2s;
    "
    :style="{ flex: uiStore().selectedPagesExpanded ? '1' : '0' }"
  >
    <q-item v-if="pageSelectionStore().selectedPages.size === 0">
      <q-item-section>
        <q-item-label
          style="color: rgba(255, 255, 255, 0.7); font-size: 13.5px"
        >
          No pages selected.
        </q-item-label>
      </q-item-section>
    </q-item>

    <div
      v-for="pageId in pageSelectionStore().selectedPages"
      :key="pageId"
      class="selected-page"
    >
      <PageItem
        icon
        :page-id="pageId"
        :active="pageId === internals.pages.react.pageId"
        prefer="absolute"
        class="selected-pages"
      />

      <DeepBtn
        icon="mdi-close"
        size="14px"
        round
        flat
        class="remove-btn"
        title="Remove from selected pages"
        @click.stop="pageSelectionStore().selectedPages.delete(pageId)"
      />
    </div>
  </q-list>
</template>

<script setup lang="ts">
import { negateProp, pluralS } from '@stdlib/misc';
import type { QNotifyUpdateOptions } from 'quasar';
import { deletePage } from 'src/code/api-interface/pages/deletion/delete';
import { movePage } from 'src/code/api-interface/pages/move';
import { asyncDialog } from 'src/code/utils/misc';
import { pageSelectionStore } from 'src/stores/page-selection';

import MovePageDialog from '../RightSidebar/PageProperties/MovePageDialog.vue';

async function movePages() {
  const movePageParams: Parameters<typeof movePage>[0] = await asyncDialog({
    component: MovePageDialog,

    componentProps: {
      groupId: internals.pages.react.page.react.groupId,
    },
  });

  const notif = $quasar().notify({
    group: false,
    timeout: 0,
    message: 'Moving pages...',
  });

  const numTotal = pageSelectionStore().selectedPages.size;

  let numSuccess = 0;
  let numFailed = 0;

  for (const [index, pageId] of Array.from(
    pageSelectionStore().selectedPages,
  ).entries()) {
    try {
      notif({
        caption: `${index} of ${numTotal}`,
      });

      await movePage({
        ...movePageParams,

        pageId,
      });

      numSuccess++;
    } catch (error) {
      numFailed++;
    }
  }

  let notifUpdateOptions: QNotifyUpdateOptions = {
    timeout: undefined,
    caption: undefined,
  };

  if (numFailed === 0) {
    notifUpdateOptions = {
      ...notifUpdateOptions,
      message: `Page${pluralS(numSuccess)} moved successfully.`,
      color: 'positive',
    };
  } else {
    notifUpdateOptions = {
      ...notifUpdateOptions,
      message: `${numSuccess > 0 ? numSuccess : 'No'} page${
        numSuccess === 1 ? ' was' : 's were'
      } moved successfully.<br/>Failed to move ${numFailed} page${pluralS(
        numFailed,
      )}.`,
      color: 'negative',
      html: true,
    };
  }

  notif(notifUpdateOptions);
}

async function deletePages() {
  await asyncDialog({
    title: 'Delete pages',
    message: 'Are you sure you want to delete these pages?',

    focus: 'cancel',
    cancel: { label: 'No', flat: true, color: 'primary' },
    ok: { label: 'Yes', flat: true, color: 'negative' },
  });

  const notif = $quasar().notify({
    group: false,
    timeout: 0,
    message: 'Deleting pages...',
  });

  const numTotal = pageSelectionStore().selectedPages.size;

  let numSuccess = 0;
  let numFailed = 0;

  for (const [index, pageId] of Array.from(
    pageSelectionStore().selectedPages,
  ).entries()) {
    try {
      notif({
        caption: `${index} of ${numTotal}`,
      });

      await deletePage(pageId);

      numSuccess++;
    } catch (error) {
      numFailed++;
    }
  }

  let notifUpdateOptions: QNotifyUpdateOptions = {
    timeout: undefined,
    caption: undefined,
  };

  if (numFailed === 0) {
    notifUpdateOptions = {
      ...notifUpdateOptions,
      message: `Page${pluralS(numSuccess)} deleted successfully.`,
      color: 'positive',
    };
  } else {
    notifUpdateOptions = {
      ...notifUpdateOptions,
      message: `${numSuccess > 0 ? numSuccess : 'No'} page${
        numSuccess === 1 ? ' was' : 's were'
      } deleted successfully.<br/>Failed to delete ${numFailed} page${pluralS(
        numFailed,
      )}.`,
      color: 'negative',
      html: true,
    };
  }

  notif(notifUpdateOptions);
}
</script>

<style scoped lang="scss">
.selected-page {
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

.selected-page:hover > .remove-btn {
  opacity: 1;
}
</style>