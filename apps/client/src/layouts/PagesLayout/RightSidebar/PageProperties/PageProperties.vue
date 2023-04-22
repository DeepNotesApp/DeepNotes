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
    <div style="padding: 20px">
      <!-- Relative title -->

      <TextField
        label="Relative title"
        dense
        :model-value="pageRelativeTitles()(page.id).get().text"
        @update:model-value="pageRelativeTitles()(page.id).set($event as any)"
        :disable="pageRelativeTitles()(page.id).get().status !== 'success'"
        :readonly="page.react.readOnly"
        :maxlength="maxPageTitleLength"
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
      />

      <Gap style="height: 16px" />

      <!-- Page ID -->

      <TextField
        label="Page ID"
        dense
        :model-value="page.id"
        copy-btn
        readonly
      />
    </div>

    <q-separator />

    <div style="padding: 20px; display: flex; flex-direction: column">
      <DeepBtn
        label="Group settings"
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
        color="primary"
        :disable="page.react.readOnly"
        @click="_movePage"
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

    <VersionHistory />

    <q-separator />

    <PageBacklinks />
  </div>
</template>

<script setup lang="ts">
import { maxPageTitleLength } from '@deeplib/misc';
import { deletePage } from 'src/code/api-interface/pages/deletion/delete';
import type { MovePageParams } from 'src/code/api-interface/pages/move';
import { movePage } from 'src/code/api-interface/pages/move';
import { pageAbsoluteTitles } from 'src/code/pages/computed/page-absolute-titles';
import { pageRelativeTitles } from 'src/code/pages/computed/page-relative-titles';
import type { Page } from 'src/code/pages/page/page';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

import GroupSettingsDialog from './GroupSettingsDialog/GroupSettingsDialog.vue';
import MovePageDialog from './MovePageDialog.vue';
import PageBacklinks from './PageBacklinks.vue';
import VersionHistory from './VersionHistory.vue';

const page = inject<Ref<Page>>('page')!;

async function _movePage() {
  try {
    const movePageParams: MovePageParams = await asyncDialog({
      component: MovePageDialog,

      componentProps: {
        groupId: page.value.react.groupId,
      },
    });

    await movePage(page.value.id, movePageParams);

    $quasar().notify({
      message: 'Page moved successfully.',
      color: 'positive',
    });
  } catch (error) {
    handleError(error);
  }
}

async function _deletePage() {
  try {
    await asyncDialog({
      title: 'Delete page',
      message: 'Are you sure you want to delete this page?',

      focus: 'cancel',
      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await deletePage(page.value.id);

    $quasar().notify({
      message: 'Page deleted successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
