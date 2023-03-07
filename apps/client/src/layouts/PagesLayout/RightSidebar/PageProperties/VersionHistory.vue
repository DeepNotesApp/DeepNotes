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
      <q-item v-if="snapshotInfos.length === 0">
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
          class="snapshot-delete-btn"
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
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { Y } from '@syncedstore/core';
import { capitalize } from 'lodash';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings.client';
import type { Page } from 'src/code/pages/page/page.client';
import { revertToSnapshot } from 'src/code/pages/utils.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

const page = inject<Ref<Page>>('page')!;

const snapshotInfos = computed(
  (): PageSnapshotInfo[] =>
    page.value.realtimeCtx.hget('page-snaphots', page.value.id, 'infos') ?? [],
);

async function restoreVersion(snapshotId: string) {
  try {
    await asyncPrompt({
      title: 'Restore version',
      message: 'Are you sure you want to restore this version?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const pageKeyring = await pageKeyrings()(
      `${page.value.react.groupId}:${page.value.id}`,
    ).getAsync();

    if (pageKeyring == null) {
      throw new Error('Page keyring not found.');
    }

    const response = (
      await api().post<{
        encryptedSymmetricKey: string;
        encryptedData: string;
      }>(`/api/pages/${page.value.id}/snapshots/load/${snapshotId}`)
    ).data;

    // Encrypt pre-restore data

    const newSnapshotSymmetricKey = wrapSymmetricKey();

    const encryptedData = bytesToBase64(
      newSnapshotSymmetricKey.encrypt(
        Y.encodeStateAsUpdateV2(page.value.collab.doc),
        {
          padding: true,
          associatedData: {
            context: 'PageDocUpdate',
            pageId: page.value.id,
          },
        },
      ),
    );

    // Restore snapshot

    const oldSnapshotSymmetricKey = wrapSymmetricKey(
      pageKeyring.decrypt(base64ToBytes(response.encryptedSymmetricKey), {
        associatedData: {
          context: 'PageSnapshotSymmetricKey',
          pageId: page.value.id,
        },
      }),
    );

    const snapshotData = oldSnapshotSymmetricKey.decrypt(
      base64ToBytes(response.encryptedData),
      {
        padding: true,
        associatedData: {
          context: 'PageDocUpdate',
          pageId: page.value.id,
        },
      },
    );

    revertToSnapshot(page.value.collab.doc, snapshotData);

    // Save pre-restore data

    await api().post(`/api/pages/${page.value.id}/snapshots/save`, {
      encryptedSymmetricKey: bytesToBase64(
        pageKeyring.encrypt(newSnapshotSymmetricKey.value, {
          associatedData: {
            context: 'PageSnapshotSymmetricKey',
            pageId: page.value.id,
          },
        }),
      ),
      encryptedData,

      preRestore: true,
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
    await asyncPrompt({
      title: 'Save version',
      message: 'Are you sure you want to save this version?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const pageKeyring = pageKeyrings()(
      `${page.value.react.groupId}:${page.value.id}`,
    ).get();

    if (pageKeyring == null) {
      throw new Error('Page keyring not found.');
    }

    const symmetricKey = wrapSymmetricKey();

    await api().post(`/api/pages/${page.value.id}/snapshots/save`, {
      encryptedSymmetricKey: bytesToBase64(
        pageKeyring.encrypt(symmetricKey.value, {
          associatedData: {
            context: 'PageSnapshotSymmetricKey',
            pageId: page.value.id,
          },
        }),
      ),
      encryptedData: bytesToBase64(
        symmetricKey.encrypt(Y.encodeStateAsUpdateV2(page.value.collab.doc), {
          padding: true,
          associatedData: {
            context: 'PageDocUpdate',
            pageId: page.value.id,
          },
        }),
      ),
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
    await asyncPrompt({
      title: 'Delete version',
      message: 'Are you sure you want to delete this version?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await api().post(
      `/api/pages/${page.value.id}/snapshots/delete/${snapshotId}`,
    );

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

  > .snapshot-delete-btn {
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

.snapshot:hover > .snapshot-delete-btn {
  opacity: 1;
}
</style>
