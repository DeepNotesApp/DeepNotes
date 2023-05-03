<template>
  <div style="padding: 20px; display: flex; flex-direction: column">
    Version history:

    <Gap style="height: 8px" />

    <q-list
      style="
        border-radius: 6px;
        height: 220px;
        background-color: #383838;
        overflow: auto;
      "
    >
      <q-item
        v-if="snapshotInfos.length === 0"
        style="color: #b0b0b0"
      >
        <q-item-section>
          <q-item-label>No versions available</q-item-label>
        </q-item-section>
      </q-item>

      <div
        v-for="snapshotInfo of snapshotInfos"
        :key="snapshotInfo.id"
        class="snapshot"
      >
        <q-item
          clickable
          @click="restoreVersion(snapshotInfo.id)"
        >
          <q-item-section>
            <q-item-label>{{
              Intl.DateTimeFormat('en', {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(snapshotInfo.creationDate)
            }}</q-item-label>

            <q-item-label
              caption
              style="display: flex"
            >
              <div style="flex: 1">
                {{
                  groupMemberNames()(
                    `${page.react.groupId}:${snapshotInfo.authorId}`,
                  ).get().text
                }}
              </div>

              <Gap style="width: 20px" />

              <div>{{ capitalize(snapshotInfo.type) }}</div>
            </q-item-label>
          </q-item-section>
        </q-item>

        <DeepBtn
          class="delete-btn"
          size="12px"
          icon="mdi-close"
          round
          flat
          @click="deleteSnapshot(snapshotInfo.id)"
        />
      </div>
    </q-list>

    <Gap style="height: 16px" />

    <DeepBtn
      label="Save current version"
      color="secondary"
      :disable="page.react.readOnly"
      @click="saveVersion"
    />
  </div>
</template>

<script setup lang="ts">
import type { PageSnapshotInfo } from '@deeplib/misc';
import { capitalize } from 'lodash';
import { deletePageSnapshot } from 'src/code/api-interface/pages/snapshots/delete';
import { restorePageSnapshot } from 'src/code/api-interface/pages/snapshots/restore';
import { savePageSnapshot } from 'src/code/api-interface/pages/snapshots/save';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import type { Page } from 'src/code/pages/page/page';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

const snapshotInfos = computed(
  (): PageSnapshotInfo[] =>
    page.value.realtimeCtx.hget('page-snaphots', page.value.id, 'infos') ?? [],
);

async function restoreVersion(snapshotId: string) {
  try {
    await asyncDialog({
      title: 'Restore version',
      message: 'Are you sure you want to restore this version?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await restorePageSnapshot({
      pageId: page.value.id,
      snapshotId,
      groupId: page.value.react.groupId,
      doc: page.value.collab.doc,
    });

    $quasar().notify({
      message: 'Version restored successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}

async function saveVersion() {
  try {
    await asyncDialog({
      title: 'Save version',
      message: 'Are you sure you want to save this version?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await savePageSnapshot({
      pageId: page.value.id,
      groupId: page.value.react.groupId,
      doc: page.value.collab.doc,
    });

    $quasar().notify({
      message: 'Version saved successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}

async function deleteSnapshot(snapshotId: string) {
  try {
    await asyncDialog({
      title: 'Delete version',
      message: 'Are you sure you want to delete this version?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await deletePageSnapshot(page.value.id, snapshotId);

    $quasar().notify({
      message: 'Version deleted successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>

<style scoped lang="scss">
.snapshot {
  position: relative;

  > .delete-btn {
    position: absolute;

    top: 4px;
    right: 10px;

    opacity: 0;
    transition: opacity 0.2s;

    min-width: 24px;
    min-height: 24px;
    width: 24px;
    height: 24px;
  }
}

.snapshot:hover > .delete-btn {
  opacity: 1;
}
</style>
