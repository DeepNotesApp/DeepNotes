<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 240px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Accept request</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 20px; padding-top: 16px">
        Target role:

        <Gap style="height: 8px" />

        <q-select
          :options="roles()"
          option-label="name"
          option-value="id"
          filled
          emit-value
          map-options
          dense
          v-model="targetRole"
        >
          <template #selected>
            <template v-if="targetRole">
              {{ rolesMap()[targetRole].name }}
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
          color="negative"
          @click="dialogRef.onDialogCancel()"
        />
        <DeepBtn
          label="Ok"
          type="submit"
          flat
          color="primary"
          @click.prevent="acceptRequest()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */

import { roles, rolesMap } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings.client';
import { groupInternalKeyrings } from 'src/code/pages/computed/group-internal-keyrings.client';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { groupNames } from 'src/code/pages/computed/group-names.client';
import { groupRequestNames } from 'src/code/pages/computed/group-request-names.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

import type { initialSettings } from '../GroupSettingsDialog.vue';

const props = defineProps<{
  settings: ReturnType<typeof initialSettings>;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const targetRole = ref<string | null>(null);

async function acceptRequest() {
  if (targetRole.value == null) {
    $quasar().notify({
      message: 'Please select a role.',
      color: 'negative',
    });

    return;
  }

  const patientId = [...props.settings.requests.selectedUserIds][0];

  try {
    const [accessKeyring, groupInternalKeyring] = await Promise.all([
      groupAccessKeyrings()(props.settings.groupId).getAsync(),
      groupInternalKeyrings()(props.settings.groupId).getAsync(),
    ]);

    if (accessKeyring == null || groupInternalKeyring == null) {
      throw new Error('Group keyrings not found.');
    }

    const userPublicKeyringBytes = await internals.realtime.hget(
      'user',
      patientId,
      'public-keyring',
    );

    if (userPublicKeyringBytes == null) {
      throw new Error('User public key not found.');
    }

    const userPublicKeyring = createPublicKeyring(userPublicKeyringBytes);

    const [groupName, agentName, targetName] = await Promise.all([
      groupNames()(props.settings.groupId).getAsync(),

      groupMemberNames()(
        `${props.settings.groupId}:${authStore().userId}`,
      ).getAsync(),

      groupRequestNames()(`${props.settings.groupId}:${patientId}`).getAsync(),
    ]);

    await requestWithNotifications({
      url: `/api/groups/${props.settings.groupId}/join-requests/accept`,

      body: {
        patientId,
        targetRole: targetRole.value,

        encryptedAccessKeyring: bytesToBase64(
          accessKeyring.wrapAsymmetric(internals.keyPair, userPublicKeyring)
            .fullValue,
        ),
        encryptedInternalKeyring: bytesToBase64(
          groupInternalKeyring.wrapAsymmetric(
            internals.keyPair,
            userPublicKeyring,
          ).fullValue,
        ),
      },

      patientId,

      notifications: {
        agent: {
          groupId: props.settings.groupId,

          groupName: groupName.text,

          targetName: targetName.text,

          // You have accepted the join request of ${targetName}.
        },

        target: {
          groupId: props.settings.groupId,

          groupName: groupName.text,

          // Your join request was accepted.
        },

        observers: {
          groupId: props.settings.groupId,

          groupName: groupName.text,

          agentName: agentName.text,

          targetName: targetName.text,

          // ${agentName} has accepted the join request of ${targetName}.
        },
      },
    });

    props.settings.requests.selectedUserIds.clear();

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
