<template>
  <!-- Collapsed sidebar -->

  <q-list v-if="!uiStore().rightSidebarExpanded">
    <MiniSidebarBtn
      tooltip="Group settings"
      icon="mdi-account-cog"
      @click="
        $q.dialog({
          component: GroupSettingsDialog,

          componentProps: {
            groupId: page.react.groupId,
          },
        })
      "
    />
  </q-list>

  <!-- Expanded sidebar -->

  <div v-else>
    <div style="padding: 20px; display: flex; flex-direction: column">
      <!-- Relative title -->

      <TextField
        label="Relative title"
        dense
        :model-value="pageRelativeTitles()(page.id).get().text"
        @update:model-value="pageRelativeTitles()(page.id).set($event as any)"
        :disable="pageRelativeTitles()(page.id).get().status !== 'success'"
        :readonly="page.react.readOnly"
        :maxlength="maxPageTitleLength"
        title="Title displayed in the page path"
      />

      <Gap style="height: 16px" />

      <!-- Absolute title -->

      <TextField
        label="Absolute title"
        dense
        :model-value="pageAbsoluteTitles()(page.id).get().text"
        @update:model-value="pageAbsoluteTitles()(page.id).set($event as any)"
        :disable="pageAbsoluteTitles()(page.id).get().status !== 'success'"
        :readonly="page.react.readOnly"
        :maxlength="maxPageTitleLength"
        title="Title displayed outside the page path"
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <!-- Page ID -->

      <TextField
        label="Page ID"
        dense
        :model-value="page.id"
        copy-btn
        readonly
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Copy link to this page"
        icon="mdi-content-copy"
        color="primary"
        @click="
          async () => {
            await setClipboardText(`https://deepnotes.app/pages/${page.id}`);

            $q.notify({
              message: 'Copied to clipboard.',
              type: 'positive',
            });
          }
        "
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <DeepBtn
        label="Group settings"
        icon="mdi-account-cog"
        color="primary"
        @click="
          $q.dialog({
            component: GroupSettingsDialog,

            componentProps: {
              groupId: page.react.groupId,
            },
          })
        "
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <DeepBtn
        label="Move page"
        icon="mdi-file-move"
        color="primary"
        :disable="page.react.readOnly"
        title="Move page to another group or set as group's main page"
        @click="_movePage"
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Add page to favorites"
        icon="mdi-star"
        color="primary"
        :disable="page.react.readOnly"
        @click="addPageToFavorites"
      />

      <Gap style="height: 16px" />

      <DeepBtn
        label="Delete page"
        color="negative"
        :disable="page.react.readOnly"
        @click="_deletePage"
      />
    </div>

    <q-separator />

    <PageSelection />

    <q-separator />

    <VersionHistory />

    <q-separator />

    <PageBacklinks />
  </div>
</template>

<script setup lang="ts">
import { maxPageTitleLength } from '@deeplib/misc';
import { deletePage } from 'src/code/api-interface/pages/deletion/delete';
import { deletePagePermanently } from 'src/code/api-interface/pages/deletion/delete-permanently';
import { movePage } from 'src/code/api-interface/pages/move';
import { pageAbsoluteTitles } from 'src/code/pages/computed/page-absolute-titles';
import { pageRelativeTitles } from 'src/code/pages/computed/page-relative-titles';
import type { Page } from 'src/code/pages/page/page';
import { setClipboardText } from 'src/code/utils/clipboard';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import DeletionDialog from 'src/components/DeletionDialog.vue';
import type { Ref } from 'vue';

import GroupSettingsDialog from './GroupSettingsDialog/GroupSettingsDialog.vue';
import MovePageDialog from './MovePageDialog.vue';
import PageBacklinks from './PageBacklinks.vue';
import PageSelection from './PageSelection.vue';
import VersionHistory from './VersionHistory.vue';

const page = inject<Ref<Page>>('page')!;

async function _movePage() {
  try {
    const movePageParams: Parameters<typeof movePage>[0] = await asyncDialog({
      component: MovePageDialog,

      componentProps: {
        groupId: page.value.react.groupId,
      },
    });

    await movePage({
      ...movePageParams,

      pageId: page.value.id,
    });

    $quasar().notify({
      message: 'Page moved successfully.',
      color: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}

async function addPageToFavorites() {
  try {
    await trpcClient.users.pages.addFavoritePages.mutate({
      pageIds: [page.value.id],
    });

    $quasar().notify({
      message: 'Page added to favorites successfully.',
      color: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}

async function _deletePage() {
  try {
    const { deletePermanently } = await asyncDialog({
      component: DeletionDialog,
      componentProps: { subject: 'page' },
    });

    if (deletePermanently) {
      await deletePagePermanently(page.value.id);
    } else {
      await deletePage(page.value.id);
    }

    $quasar().notify({
      message: 'Page deleted successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
