<template>
  <div style="display: flex; flex-direction: column">
    <template
      v-if="authStore().loggedIn && groupId !== internals.personalGroupId"
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
        :readonly="
          !rolesMap()[
            realtimeCtx.hget(
              'group-member',
              `${groupId}:${authStore().userId}`,
              'role',
            )
          ]?.permissions.editGroupSettings
        "
      />

      <template
        v-if="
          realtimeCtx.hget(
            'group-member',
            `${groupId}:${authStore().userId}`,
            'exists',
          )
        "
      >
        <Gap style="height: 20px" />

        <div>
          Your name in this group

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
          :disable="
            !realtimeCtx.hget(
              'group-member',
              `${groupId}:${authStore().userId}`,
              'exists',
            )
          "
        />
      </template>

      <Gap style="height: 28px" />

      <q-separator />

      <Gap style="height: 20px" />
    </template>

    <b>Group infos</b>

    <Gap style="height: 20px" />

    <TextField
      label="Group ID"
      :model-value="groupId"
      dense
      style="max-width: 300px"
      readonly
      copy-btn
    />

    <template
      v-if="
        realtimeCtx.hget(
          'group-member',
          `${groupId}:${authStore().userId}`,
          'exists',
        )
      "
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
            openInNewTab: isCtrlDown(event as MouseEvent),
          });

          dialog.onDialogOK();
        }
      "
    />

    <template
      v-if="
        rolesMap()[
          realtimeCtx.hget(
            'group-member',
            `${groupId}:${authStore().userId}`,
            'role',
          )
        ]?.permissions.editGroupSettings
      "
    >
      <Gap style="height: 28px" />

      <q-separator />

      <Gap style="height: 20px" />

      <b>Group security</b>

      <Gap style="height: 20px" />

      <div style="max-width: 300px; display: flex; flex-direction: column">
        <template v-if="groupId !== internals.personalGroupId">
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
        </template>

        <RotateGroupKeys />
      </div>
    </template>

    <template
      v-if="
        groupId !== internals.personalGroupId &&
        rolesMap()[
          realtimeCtx.hget(
            'group-member',
            `${groupId}:${authStore().userId}`,
            'role',
          )
        ]?.permissions.editGroupSettings
      "
    >
      <Gap style="height: 28px" />

      <q-separator />

      <Gap style="height: 20px" />

      <b>Group privacy</b>

      <Gap style="height: 20px" />

      <div style="max-width: 300px; display: flex; flex-direction: column">
        <AllowJoinRequestsCheckbox />

        <Gap style="height: 16px" />

        <MakePrivateBtn
          v-if="
            internals.realtime.globalCtx.hget('group', groupId, 'is-public')
          "
        />
        <MakePublicBtn v-else />
      </div>
    </template>

    <template
      v-if="
        groupId !== internals.personalGroupId &&
        rolesMap()[
          realtimeCtx.hget(
            'group-member',
            `${groupId}:${authStore().userId}`,
            'role',
          )
        ]?.permissions.editGroupSettings
      "
    >
      <Gap style="height: 28px" />

      <q-separator />

      <Gap style="height: 20px" />

      <b>Danger zone</b>

      <Gap style="height: 20px" />

      <div style="max-width: 300px; display: flex; flex-direction: column">
        <DeleteGroupBtn />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { maxGroupNameLength, maxNameLength, rolesMap } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { createSymmetricKeyring } from '@stdlib/crypto';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names';
import { groupNames } from 'src/code/pages/computed/group-names';
import type { RealtimeContext } from 'src/code/realtime/context';
import { isCtrlDown } from 'src/code/utils/misc';
import type { Ref } from 'vue';

import AllowJoinRequestsCheckbox from './AllowJoinRequestsCheckbox.vue';
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
