<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Create new page</div>
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
            <TextField
              label="Page title"
              ref="pageRelativeTitleElem"
              v-model="pageRelativeTitle"
              :maxlength="maxPageTitleLength"
            />

            <Gap style="height: 16px" />

            <q-select
              label="Destination group"
              :options="groupOptions"
              option-label="name"
              option-value="id"
              filled
              emit-value
              map-options
              :model-value="destGroupId"
              @update:model-value="
                async (value) => {
                  if (value === 'new') {
                    groupName = pageRelativeTitle;
                    pageRelativeTitle = 'Main page';

                    await $nextTick();

                    groupNameElem?.$el.focus();
                  } else if (destGroupId === 'new') {
                    pageRelativeTitle = groupName;

                    await $nextTick();

                    pageRelativeTitleElem?.$el.focus();
                  }

                  destGroupId = value;
                }
              "
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
          @click.prevent="createPage()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import {
  maxGroupNameLength,
  maxNameLength,
  maxPageTitleLength,
} from '@deeplib/misc';
import { bytesToBase64, bytesToBase64Safe } from '@stdlib/base64';
import type { PublicKeyring, SymmetricKeyring } from '@stdlib/crypto';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { DataLayer } from '@stdlib/crypto';
import { BREAKPOINT_MD_MIN, sleep, splitStr } from '@stdlib/misc';
import { textToBytes } from '@stdlib/misc';
import { zxcvbn } from '@zxcvbn-ts/core';
import { nanoid } from 'nanoid';
import {
  generateGroupValues,
  unlockGroupContentKeyring,
} from 'src/code/crypto.client';
import { groupContentKeyrings } from 'src/code/pages/computed/group-content-keyrings.client';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { useRealtimeContext } from 'src/code/realtime/context.universal';
import { asyncPrompt, handleError } from 'src/code/utils.client';
import type { ComponentPublicInstance, Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const props = defineProps<{
  callback: (url: string) => void;
}>();

const page = computed(() => internals.pages.react.page);

const horizontal = computed(() => uiStore().width >= BREAKPOINT_MD_MIN);

const pageRelativeTitle = ref('');
const pageRelativeTitleElem = ref<ComponentPublicInstance>();

const realtimeCtx = useRealtimeContext();

const groupIds = ref<string[]>([]);

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

const destGroupId = ref<string>();

// Group creation

const groupName = ref('');
const groupNameElem = ref<ComponentPublicInstance>();

const groupIsPublic = ref(false);

const groupIsPasswordProtected = ref(false);
const groupPassword = ref('');

const groupMemberName = ref('');

onMounted(async () => {
  // Initialize group IDs

  groupIds.value = [page.value.react.groupId];
  destGroupId.value = page.value.react.groupId;

  // Initialize page title

  const activeElem = internals.pages.react.page.activeElem.react.value;

  if (activeElem?.type !== 'note') {
    return;
  }

  if (activeElem.react.topSection !== 'container') {
    const text = activeElem.react.collab[activeElem.react.topSection].value;

    pageRelativeTitle.value = splitStr(text.toDOM().textContent!, '\n')[0];

    await sleep();

    pageRelativeTitleElem.value?.$el.focus();
  }

  // Load recent group IDs

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

async function createPage() {
  try {
    if (pageRelativeTitle.value === '') {
      $quasar().notify({
        message: 'Please enter a page title.',
        type: 'negative',
      });

      pageRelativeTitleElem.value?.$el.focus();

      return;
    }

    let groupContentKeyring: SymmetricKeyring | undefined;

    const request = {} as {
      parentPageId: string;
      groupId: string;
      pageId: string;

      pageEncryptedSymmetricKeyring: string;
      pageEncryptedRelativeTitle: string;
      pageEncryptedAbsoluteTitle: string;

      createGroup: boolean;
      groupEncryptedName: string;
      groupPasswordHash?: string;
      groupIsPublic: boolean;
      accessKeyring: string;
      groupEncryptedInternalKeyring: string;
      groupEncryptedContentKeyring: string;
      groupPublicKeyring: string;
      groupEncryptedPrivateKeyring: string;
      groupMemberEncryptedName: string;
    };

    request.parentPageId = page.value.id;

    request.pageId = nanoid();

    request.createGroup = destGroupId.value === 'new';

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

      request.groupId = groupValues.groupId;

      groupContentKeyring = groupValues.contentKeyring;

      request.groupEncryptedName = bytesToBase64(
        groupValues.accessKeyring.encrypt(textToBytes(groupName.value), {
          padding: true,
          associatedData: {
            context: 'GroupName',
            groupId: groupValues.groupId,
          },
        }),
      );

      request.groupPasswordHash = bytesToBase64Safe(
        groupValues.passwordValues?.passwordHash,
      );

      request.groupIsPublic = groupIsPublic.value;

      request.accessKeyring = bytesToBase64(
        groupValues.finalAccessKeyring.fullValue,
      );
      request.groupEncryptedInternalKeyring = bytesToBase64(
        groupValues.encryptedInternalKeyring.fullValue,
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
      request.groupId = destGroupId.value!;

      groupContentKeyring = await groupContentKeyrings()(
        destGroupId.value!,
      ).getAsync();

      if (groupContentKeyring?.topLayer === DataLayer.Symmetric) {
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

        groupContentKeyring = await unlockGroupContentKeyring(
          request.groupId!,
          destGroupPassword,
        );
      }
    }

    if (groupContentKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid group content keyring.');
    }

    const pageKeyring = createSymmetricKeyring();

    request.pageEncryptedSymmetricKeyring = bytesToBase64(
      pageKeyring.wrapSymmetric(groupContentKeyring, {
        associatedData: {
          context: 'PageKeyring',
          pageId: request.pageId,
        },
      }).fullValue,
    );
    request.pageEncryptedRelativeTitle = bytesToBase64(
      pageKeyring.encrypt(textToBytes(pageRelativeTitle.value), {
        padding: true,
        associatedData: {
          context: 'PageRelativeTitle',
          pageId: request.pageId,
        },
      }),
    );
    request.pageEncryptedAbsoluteTitle = bytesToBase64(
      pageKeyring.encrypt(textToBytes(''), {
        padding: true,
        associatedData: {
          context: 'PageAbsoluteTitle',
          pageId: request.pageId,
        },
      }),
    );

    const response = (
      await api().post<{
        pageId: string;
        message?: string;
      }>('/api/pages/create', request)
    ).data;

    props.callback?.(
      /* destGroupId.value === 'new' // Buggy, implement later
        ? `/groups/${request.groupId}`
        : */ `/pages/${response.pageId}`,
    );

    await internals.pages.goToPage(response.pageId, { fromParent: true });

    $quasar().notify({
      message: response.message ?? 'Page created successfully.',
      type: 'positive',
    });

    dialogRef.value.onDialogOK();
  } catch (error) {
    handleError(error);
  }
}
</script>
