<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Invite user</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 20px">
        <TextField
          label="User ID or Email"
          dense
          v-model="identity"
          :maxlength="maxEmailLength"
        />

        <Gap style="height: 16px" />

        <TextField
          label="Display name"
          dense
          v-model="userName"
          :maxlength="maxNameLength"
        />

        <Gap style="height: 16px" />

        <q-select
          :options="roles()"
          option-label="name"
          option-value="id"
          filled
          emit-value
          map-options
          dense
          v-model="role"
        >
          <template #selected>
            <template v-if="role">
              {{ rolesMap()[role].name }}
            </template>
            <template v-else>(Select a role)</template>
          </template>
        </q-select>
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
          @click.prevent="inviteUser()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { maxNameLength, roles, rolesMap } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { bytesToBase64Safe } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
import {
  isNanoID,
  maxEmailLength,
  textToBytes,
  w3cEmailRegex,
} from '@stdlib/misc';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings.client';
import { groupInternalKeyrings } from 'src/code/pages/computed/group-internal-keyrings.client';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';
import { z } from 'zod';

import type { initialSettings } from '../GroupSettingsDialog.vue';

const props = defineProps<{
  settings: ReturnType<typeof initialSettings>;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const identity = ref<string>('');
const userName = ref<string>('');
const role = ref<string | null>(null);

async function inviteUser() {
  if (
    !z
      .string()
      .refine(isNanoID)
      .or(z.string().regex(w3cEmailRegex))
      .safeParse(identity.value).success
  ) {
    $quasar().notify({
      message: 'Invalid email or user ID.',
      type: 'negative',
    });

    return;
  }

  if (userName.value === '') {
    $quasar().notify({
      message: 'Please enter a display name.',
      type: 'negative',
    });

    return;
  }

  if (role.value == null) {
    $quasar().notify({
      message: 'Please select a role.',
      type: 'negative',
    });

    return;
  }

  try {
    let inviteeUserId;

    if (isNanoID(identity.value)) {
      inviteeUserId = identity.value;
    } else {
      inviteeUserId = await internals.realtime.hget(
        'email',
        identity.value,
        'user-id',
      );
    }

    if (inviteeUserId == null) {
      $quasar().notify({
        message: 'User not found.',
        type: 'negative',
      });

      return;
    }

    const [inviteePublicKeyring, groupPublicKeyring] = await Promise.all([
      (async () =>
        createPublicKeyring(
          await internals.realtime.hget(
            'user',
            inviteeUserId,
            'public-keyring',
          ),
        ))(),

      (async () =>
        createPublicKeyring(
          await internals.realtime.hget(
            'group',
            props.settings.groupId,
            'public-keyring',
          ),
        ))(),
    ]);

    const [accessKeyring, groupInternalKeyring] = await Promise.all([
      groupAccessKeyrings()(props.settings.groupId).getAsync(),
      groupInternalKeyrings()(props.settings.groupId).getAsync(),
    ]);

    if (accessKeyring == null || groupInternalKeyring == null) {
      throw new Error('Group keyrings not found.');
    }

    const [groupName, agentName] = await Promise.all([
      groupNames()(props.settings.groupId).getAsync(),

      groupMemberNames()(
        `${props.settings.groupId}:${authStore().userId}`,
      ).getAsync(),
    ]);

    await requestWithNotifications({
      url: `/api/groups/${props.settings.groupId}/join-invitations/send`,

      body: {
        patientId: inviteeUserId,
        invitationRole: role.value,

        encryptedAccessKeyring: bytesToBase64(
          accessKeyring.wrapAsymmetric(internals.keyPair, inviteePublicKeyring)
            .fullValue,
        ),
        encryptedInternalKeyring: bytesToBase64(
          groupInternalKeyring.wrapAsymmetric(
            internals.keyPair,
            inviteePublicKeyring,
          ).fullValue,
        ),

        userEncryptedName: bytesToBase64Safe(
          internals.keyPair.encrypt(
            textToBytes(userName.value),
            groupPublicKeyring,
            { padding: true },
          ),
        ),
      },

      patientId: inviteeUserId,

      notifications: {
        agent: {
          groupId: props.settings.groupId,

          groupName: groupName.text,
          targetName: userName.value,

          // You invited ${targetName} to join the group.
        },

        target: {
          groupId: props.settings.groupId,

          groupName: groupName.text,

          // Your were invited to join the group.
        },

        observers: {
          groupId: props.settings.groupId,

          groupName: groupName.text,
          agentName: agentName.text,
          targetName: userName.value,

          // ${agentName} invited ${targetName} to join the group.
        },
      },
    });

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
