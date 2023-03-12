<template>
  <div style="display: flex; flex-direction: column">
    <template
      v-if="
        authStore().loggedIn &&
        !realtimeCtx.hget('group', groupId, 'is-personal')
      "
    >
      <div>
        Group name

        <q-icon
          name="mdi-information"
          size="15px"
          style="margin-top: -1px; opacity: 0.9"
        >
          <q-tooltip
            anchor="top middle"
            self="bottom middle"
            transition-show="jump-up"
            transition-hide="jump-down"
            max-width="164px"
          >
            This value is encrypted, unreadable to the server.
          </q-tooltip>
        </q-icon>
      </div>

      <Gap style="height: 8px" />

      <TextField
        :model-value="groupNames()(groupId).get().text"
        @update:model-value="groupNames()(groupId).set($event as any)"
        style="max-width: 300px"
        dense
        :maxlength="maxGroupNameLength"
      />

      <Gap style="height: 20px" />

      <div>
        Your in-group name

        <q-icon
          name="mdi-information"
          size="15px"
          style="margin-top: -1px; opacity: 0.9"
        >
          <q-tooltip
            anchor="top middle"
            self="bottom middle"
            transition-show="jump-up"
            transition-hide="jump-down"
            max-width="164px"
          >
            This value is encrypted, unreadable to the server.
          </q-tooltip>
        </q-icon>
      </div>

      <Gap style="height: 8px" />

      <TextField
        :model-value="
          groupMemberNames()(`${groupId}:${authStore().userId}`).get().text
        "
        @update:model-value="
          groupMemberNames()(`${groupId}:${authStore().userId}`).set(
            $event as any,
          )
        "
        style="max-width: 300px"
        dense
        :maxlength="maxNameLength"
      />

      <Gap style="height: 24px" />
    </template>

    <q-separator />

    <Gap style="height: 20px" />

    <div>Group infos</div>

    <Gap style="height: 8px" />

    <TextField
      label="Group ID"
      :model-value="groupId"
      dense
      style="max-width: 300px"
      readonly
      copy-btn
    />

    <template
      v-if="!internals.realtime.globalCtx.hget('group', groupId, 'is-public')"
    >
      <Gap style="height: 16px" />

      <TextField
        label="Distributor's public key"
        :model-value="distributorsPublicKeyring"
        dense
        style="max-width: 300px"
        readonly
        copy-btn
      />
    </template>

    <Gap style="height: 16px" />

    <DeepBtn
      label="Go to main page"
      style="max-width: 300px"
      color="primary"
      @click="
        async (event) => {
          await internals.pages.goToGroup(groupId, {
            openInNewTab: (event as MouseEvent).ctrlKey,
          });

          dialog.onDialogOK();
        }
      "
    />

    <template
      v-if="
        authStore().loggedIn &&
        !realtimeCtx.hget('group', groupId, 'is-personal')
      "
    >
      <Gap style="height: 24px" />

      <q-separator />

      <Gap style="height: 20px" />

      <div>Group security</div>

      <Gap style="height: 10px" />

      <div style="max-width: 300px; display: flex; flex-direction: column">
        <template
          v-if="
            internals.realtime.globalCtx.hget(
              'group',
              groupId,
              'is-password-protected',
            )
          "
        >
          <ChangePasswordBtn />

          <Gap style="height: 16px" />

          <DisablePasswordProtectionBtn />
        </template>

        <template v-else>
          <EnablePasswordProtectionBtn />
        </template>

        <Gap style="height: 16px" />

        <RotateGroupKeys />
      </div>

      <Gap style="height: 24px" />

      <q-separator />

      <Gap style="height: 20px" />

      <div>Group privacy</div>

      <Gap style="height: 10px" />

      <div style="max-width: 300px; display: flex; flex-direction: column">
        <MakePrivateBtn
          v-if="
            internals.realtime.globalCtx.hget('group', groupId, 'is-public')
          "
        />
        <MakePublicBtn v-else />
      </div>

      <Gap style="height: 24px" />

      <q-separator />

      <Gap style="height: 20px" />

      <div>Danger zone</div>

      <Gap style="height: 10px" />

      <div style="max-width: 300px; display: flex; flex-direction: column">
        <DeleteGroupBtn />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { maxGroupNameLength, maxNameLength } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import type { RealtimeContext } from 'src/code/realtime/context.universal';
import type { Ref } from 'vue';

import DeleteGroupBtn from './DeleteGroupBtn.vue';
import MakePrivateBtn from './Privacy/MakePrivateBtn.vue';
import MakePublicBtn from './Privacy/MakePublicBtn.vue';
import ChangePasswordBtn from './Protection/ChangePasswordBtn.vue';
import DisablePasswordProtectionBtn from './Protection/DisablePasswordProtectionBtn.vue';
import EnablePasswordProtectionBtn from './Protection/EnablePasswordProtectionBtn.vue';
import RotateGroupKeys from './RotateGroupKeys.vue';

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

const groupId = inject<string>('groupId')!;

const realtimeCtx = inject<RealtimeContext>('realtimeCtx')!;

const distributorsPublicKeyring = computed(() => {
  const encryptedAccessKeyringBytes = realtimeCtx.hget(
    'group-member',
    `${groupId}:${authStore().userId}`,
    'encrypted-access-keyring',
  );

  if (encryptedAccessKeyringBytes == null) {
    return '';
  }

  const encryptedAccessKeyring = createSymmetricKeyring(
    encryptedAccessKeyringBytes,
  );

  return bytesToBase64(encryptedAccessKeyring.content.slice(0, 32));
});
</script>
