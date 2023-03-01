<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section
        style="padding: 12px 20px"
        class="text-h6"
      >
        Move page
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 0">
        <div
          style="display: flex"
          :style="{
            'flex-direction': horizontal ? 'row' : 'column',
          }"
        >
          <div style="padding: 20px; width: 260px">
            <q-select
              label="Destination group"
              :options="groupOptions"
              option-label="name"
              option-value="id"
              filled
              emit-value
              map-options
              v-model="destGroupId"
            />

            <Gap style="height: 16px" />

            <Checkbox
              label="Set as group's main page"
              :disable="destGroupId === 'new'"
              :model-value="setAsMainPage || destGroupId === 'new'"
              @update:model-value="(value) => (setAsMainPage = value)"
            />
          </div>

          <template v-if="destGroupId === 'new'">
            <q-separator :vertical="horizontal" />

            <div style="padding: 20px; width: 260px">
              <div style="font-size: 20px; font-weight: bold">New group:</div>

              <Gap style="height: 8px" />

              <TextField
                ref="groupNameElem"
                label="Group name"
                v-model="groupName"
                :maxlength="maxGroupNameLength"
              />

              <Gap style="height: 16px" />

              <Checkbox
                label="Public for viewing"
                v-model="groupIsPublic"
              />

              <Gap style="height: 16px" />

              <Checkbox
                label="Password protected"
                v-model="groupIsPasswordProtected"
              />

              <template v-if="groupIsPasswordProtected">
                <Gap style="height: 16px" />

                <EvaluatedPasswordField
                  label="Group password"
                  autocomplete="new-password"
                  v-model="groupPassword"
                />
              </template>

              <Gap style="height: 16px" />

              <TextField
                label="Your in-group name"
                v-model="groupMemberName"
                :maxlength="maxNameLength"
              />
            </div>
          </template>
        </div>
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Cancel"
          color="primary"
          @click="dialogRef.onDialogCancel()"
        />

        <DeepBtn
          label="Ok"
          type="submit"
          flat
          color="primary"
          @click.prevent="movePage()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { maxGroupNameLength, maxNameLength } from '@deeplib/misc';
import {
  base64ToBytes,
  bytesToBase64,
  bytesToBase64Safe,
} from '@stdlib/base64';
import type { PublicKeyring, SymmetricKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import {
  BREAKPOINT_MD_MIN,
  objEntries,
  objFromEntries,
  textToBytes,
} from '@stdlib/misc';
import { Y } from '@syncedstore/core';
import { zxcvbn } from '@zxcvbn-ts/core';
import {
  generateGroupValues,
  unlockGroupContentKeyring,
} from 'src/code/crypto.client';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings.client';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { pageKeyrings } from 'src/code/pages/computed/page-keyrings.client';
import { createPageDoc } from 'src/code/pages/utils.client';
import { useRealtimeContext } from 'src/code/realtime/context.universal';
import { asyncPrompt, handleError } from 'src/code/utils.client';
import type { ComponentPublicInstance, Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const page = computed(() => internals.pages.react.page);

const horizontal = computed(() => uiStore().width >= BREAKPOINT_MD_MIN);

const groupIds = ref<string[]>([]);
const destGroupId = ref<string>();

const setAsMainPage = ref(false);

// Group creation

const groupName = ref('');
const groupNameElem = ref<ComponentPublicInstance>();

const groupIsPublic = ref(false);

const groupIsPasswordProtected = ref(false);
const groupPassword = ref('');

const groupMemberName = ref('');

const realtimeCtx = useRealtimeContext();

const groupOptions = computed(() => [
  { id: 'new', name: '(New group)' },
  ...groupIds.value
    .map((groupId) => {
      if (
        realtimeCtx.hget('group', groupId, 'permanent-deletion-date') != null
      ) {
        return;
      }

      const groupName = groupNames()(groupId).get();

      if (groupName.status === 'success') {
        return { id: groupId, name: groupName.text };
      }
    })
    .filter((item) => item != null),
]);

onMounted(async () => {
  groupIds.value = [page.value.react.groupId];
  destGroupId.value = page.value.react.groupId;

  await Promise.all([
    (async () => {
      groupIds.value = (await internals.realtime.hget(
        'user',
        authStore().userId,
        'recent-group-ids',
      )) ?? [page.value.react.groupId];
    })(),

    (async () => {
      groupMemberName.value = (
        await groupMemberNames()(
          `${page.value.react.groupId}:${authStore().userId}`,
        ).getAsync()
      ).text;
    })(),
  ]);
});

async function movePage() {
  try {
    const request = {} as {
      destGroupId: string;
      setAsMainPage: boolean;

      pageEncryptedSymmetricKeyring?: string;
      pageEncryptedRelativeTitle?: string;
      pageEncryptedAbsoluteTitle?: string;
      pageEncryptedUpdate?: string;
      pageEncryptedSnapshots?: Record<
        string,
        {
          encryptedSymmetricKey: string;
          encryptedData: string;
        }
      >;

      createGroup: boolean;
      groupEncryptedName?: string;
      groupPasswordHash?: string;
      groupIsPublic?: boolean;

      accessKeyring?: string;
      groupEncryptedInternalKeyring?: string;
      groupEncryptedContentKeyring?: string;

      groupPublicKeyring?: string;
      groupEncryptedPrivateKeyring?: string;

      groupMemberEncryptedName?: string;

      requestId?: string;
    };

    request.destGroupId = destGroupId.value!;
    request.setAsMainPage = setAsMainPage.value;
    request.createGroup = destGroupId.value === 'new';

    if (destGroupId.value !== page.value.react.groupId) {
      let destGroupContentKeyring: SymmetricKeyring | undefined;

      if (request.createGroup) {
        if (groupName.value === '') {
          $quasar().notify({
            message: 'Please enter a group name.',
            type: 'negative',
          });

          return;
        }

        if (groupMemberName.value === '') {
          $quasar().notify({
            message: 'Please enter an user alias.',
            type: 'negative',
          });

          return;
        }

        if (
          groupIsPasswordProtected.value &&
          zxcvbn(groupPassword.value).score <= 2
        ) {
          await asyncPrompt({
            title: 'Weak password',
            html: true,
            message:
              'Your password is relatively weak.<br/>Are you sure you want to continue?',
            style: { width: 'max-content', padding: '4px 8px' },

            focus: 'cancel',

            cancel: { label: 'No', flat: true, color: 'primary' },
            ok: { label: 'Yes', flat: true, color: 'negative' },
          });
        }

        const groupValues = await generateGroupValues({
          userKeyPair: internals.keyPair,
          isPublic: groupIsPublic.value,
          password: groupIsPasswordProtected.value
            ? groupPassword.value
            : undefined,
        });

        request.destGroupId = groupValues.groupId;

        destGroupContentKeyring = groupValues.contentKeyring;

        request.groupEncryptedName = bytesToBase64(
          groupValues.accessKeyring.encrypt(textToBytes(groupName.value), {
            padding: true,
          }),
        );

        request.groupPasswordHash = bytesToBase64Safe(
          groupValues.passwordValues?.passwordHash,
        );

        request.groupIsPublic = groupIsPublic.value;

        request.groupEncryptedInternalKeyring = bytesToBase64(
          groupValues.encryptedInternalKeyring.fullValue,
        );
        request.accessKeyring = bytesToBase64(
          groupValues.finalAccessKeyring.fullValue,
        );
        request.groupEncryptedContentKeyring = bytesToBase64(
          groupValues.encryptedContentKeyring.fullValue,
        );

        request.groupPublicKeyring = bytesToBase64(
          (groupValues.keyPair.publicKey as PublicKeyring).fullValue,
        );
        request.groupEncryptedPrivateKeyring = bytesToBase64(
          groupValues.encryptedPrivateKeyring.fullValue,
        );

        request.groupMemberEncryptedName = bytesToBase64(
          internals.keyPair.encrypt(
            textToBytes(groupMemberName.value),
            groupValues.keyPair.publicKey,
            { padding: true },
          ),
        );
      } else {
        destGroupContentKeyring = await groupContentKeyrings()(
          destGroupId.value!,
        ).getAsync();

        if (destGroupContentKeyring?.topLayer === DataLayer.Symmetric) {
          const destGroupPassword = await asyncPrompt<string>({
            title: 'Destination group password',
            message: 'Enter the destination group password:',
            color: 'primary',
            prompt: {
              type: 'password',
              model: '',
              filled: true,
            },
            style: {
              maxWidth: '350px',
            },
            cancel: true,
          });

          destGroupContentKeyring = await unlockGroupContentKeyring(
            destGroupId.value!,
            destGroupPassword,
          );
        }
      }

      if (destGroupContentKeyring?.topLayer !== DataLayer.Raw) {
        throw new Error('Invalid group content keyring.');
      }

      // Reencrypt page data

      const encryptedPageData = (
        await api().post<{
          pageEncryptedRelativeTitle: string;
          pageEncryptedAbsoluteTitle: string;
          pageEncryptedUpdates: string[];
          pageEncryptedSnapshots: Record<
            string,
            {
              encryptedSymmetricKey: string;
              encryptedData: string;
            }
          >;

          requestId: string;
        }>(`/api/pages/${page.value.id}/move`, request)
      ).data;

      request.requestId = encryptedPageData.requestId;

      const oldPageKeyring = await pageKeyrings()(
        `${page.value.react.groupId}:${page.value.id}`,
      ).getAsync();

      if (oldPageKeyring?.topLayer !== DataLayer.Raw) {
        throw new Error('Invalid page keyring');
      }

      const newPageKeyring = createSymmetricKeyring();

      request.pageEncryptedSymmetricKeyring = bytesToBase64(
        newPageKeyring.wrapSymmetric(destGroupContentKeyring).fullValue,
      );

      request.pageEncryptedRelativeTitle = bytesToBase64(
        newPageKeyring.encrypt(
          oldPageKeyring.decrypt(
            base64ToBytes(encryptedPageData.pageEncryptedRelativeTitle),
          ),
        ),
      );

      request.pageEncryptedAbsoluteTitle = bytesToBase64(
        newPageKeyring.encrypt(
          oldPageKeyring.decrypt(
            base64ToBytes(encryptedPageData.pageEncryptedAbsoluteTitle),
          ),
        ),
      );

      const auxDoc = createPageDoc();

      auxDoc.transact(() => {
        for (const pageEncryptedUpdate of encryptedPageData.pageEncryptedUpdates) {
          try {
            Y.applyUpdateV2(
              auxDoc,
              oldPageKeyring.decrypt(base64ToBytes(pageEncryptedUpdate)),
            );
          } catch (error) {
            mainLogger().error(error);
          }
        }
      });

      request.pageEncryptedUpdate = bytesToBase64(
        newPageKeyring.encrypt(Y.encodeStateAsUpdateV2(auxDoc)),
      );

      request.pageEncryptedSnapshots = objFromEntries(
        objEntries(encryptedPageData.pageEncryptedSnapshots).map(
          ([snapshotId, { encryptedSymmetricKey, encryptedData }]) => {
            const oldSymmetricKey = wrapSymmetricKey(
              oldPageKeyring.decrypt(base64ToBytes(encryptedSymmetricKey)),
            );
            const newSymmetricKey = wrapSymmetricKey();

            return [
              snapshotId,
              {
                encryptedSymmetricKey: bytesToBase64(
                  newPageKeyring.encrypt(newSymmetricKey.value),
                ),
                encryptedData: bytesToBase64(
                  newSymmetricKey.encrypt(
                    oldSymmetricKey.decrypt(base64ToBytes(encryptedData)),
                  ),
                ),
              },
            ];
          },
        ),
      );
    }

    await api().post(`/api/pages/${page.value.id}/move`, request);

    $quasar().notify({
      message: 'Page moved successfully.',
      color: 'positive',
    });

    dialogRef.value.onDialogOK();

    if (setAsMainPage.value) {
      internals.pages.react.pathPageIds.length = 0;
      await internals.pages.updateCurrentPath(page.value.id);
    }
  } catch (error: any) {
    handleError(error);
  }
}
</script>
