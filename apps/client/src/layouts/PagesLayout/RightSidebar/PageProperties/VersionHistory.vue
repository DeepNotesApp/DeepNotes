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

      <q-item
        v-for="snapshotInfo of snapshotInfos"
        :key="snapshotInfo.id"
        clickable
        @click.capture="
          (event) => selectSnapshot(snapshotInfo.id, event as any)
        "
      >
        <q-item-section
          avatar
          style="padding-right: 4px"
        >
          <Checkbox
            :model-value="finalSelectedSnapshotIds.includes(snapshotInfo.id)"
          />
        </q-item-section>

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
    </q-list>

    <Gap style="height: 16px" />

    <DeepBtn
      label="Restore selected version"
      icon="mdi-restore"
      color="secondary"
      :disable="page.react.readOnly || finalSelectedSnapshotIds.length !== 1"
      title="Backup the current version of the page manually"
      @click="() => restoreSnapshot(finalSelectedSnapshotIds[0])"
    />

    <Gap style="height: 12px" />

    <DeepBtn
      :label="`Delete selected version${
        finalSelectedSnapshotIds.length > 1 ? 's' : ''
      }`"
      icon="mdi-trash-can"
      color="negative"
      :disable="page.react.readOnly || finalSelectedSnapshotIds.length === 0"
      title="Backup the current version of the page manually"
      @click="deleteSelectedSnapshots"
    />

    <Gap style="height: 12px" />

    <DeepBtn
      label="Save current version"
      icon="mdi-content-save"
      color="secondary"
      :disable="page.react.readOnly"
      title="Backup the current version of the page manually"
      @click="saveCurrentSnapshot"
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
    page.value.realtimeCtx.hget('page-snapshots', page.value.id, 'infos') ?? [],
);

let lastSelectedSnapshotId: string;

const baseSelectedSnapshotIds = ref(new Set<string>());

const finalSelectedSnapshotIds = computed(() =>
  snapshotInfos.value
    .filter((snapshotInfo) =>
      baseSelectedSnapshotIds.value.has(snapshotInfo.id),
    )
    .map((snapshotInfo) => snapshotInfo.id),
);

function selectSnapshot(snapshotId: string, event: MouseEvent) {
  if (event.shiftKey || internals.mobileAltKey) {
    const snapshotIds = snapshotInfos.value.map((snapshot) => snapshot.id);

    const sourceSnapshotIndex = snapshotIds.indexOf(lastSelectedSnapshotId);
    const targetSnapshotIndex = snapshotIds.indexOf(snapshotId);

    if (
      sourceSnapshotIndex >= 0 &&
      targetSnapshotIndex >= 0 &&
      sourceSnapshotIndex !== targetSnapshotIndex
    ) {
      const sign = Math.sign(targetSnapshotIndex - sourceSnapshotIndex);

      const add = !baseSelectedSnapshotIds.value.has(snapshotId);

      for (
        let i = sourceSnapshotIndex;
        i !== targetSnapshotIndex + sign;
        i += sign
      ) {
        if (add) {
          baseSelectedSnapshotIds.value.add(snapshotIds[i]);
        } else {
          baseSelectedSnapshotIds.value.delete(snapshotIds[i]);
        }
      }
    }
  } else {
    if (baseSelectedSnapshotIds.value.has(snapshotId)) {
      baseSelectedSnapshotIds.value.delete(snapshotId);
    } else {
      baseSelectedSnapshotIds.value.add(snapshotId);
    }
  }

  lastSelectedSnapshotId = snapshotId;
}

async function restoreSnapshot(snapshotId: string) {
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

async function saveCurrentSnapshot() {
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
  await asyncDialog({
    title: 'Delete version',
    message: 'Are you sure you want to delete this version?',

    focus: 'cancel',

    cancel: { label: 'No', flat: true, color: 'primary' },
    ok: { label: 'Yes', flat: true, color: 'negative' },
  });

  await deletePageSnapshot(page.value.id, snapshotId);
}

async function deleteSelectedSnapshots() {
  try {
    for (const selectedSnapshotId of finalSelectedSnapshotIds.value) {
      await deleteSnapshot(selectedSnapshotId);
    }
  } catch (error: any) {
    handleError(error);
  }
}
</script>

<style scoped lang="scss">
.delete-btn {
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
</style>
