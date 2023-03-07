<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 250px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Request access</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
        "
      >
        <TextField
          label="Your in-group name"
          v-model="userName"
          :maxlength="maxNameLength"
        />

        <LoadingOverlay v-if="loading" />
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions
        align="right"
        style="padding: 12px 20px"
      >
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
          :disable="loading"
          @click="sendJoinRequest()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { maxNameLength } from '@deeplib/misc';
import { bytesToBase64 } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
import { textToBytes } from '@stdlib/misc';
import { requestWithNotifications } from 'src/code/pages/utils.client';
import { selfUserName } from 'src/code/self-user-name.client';
import { handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

const props = defineProps<{
  groupId: string;
}>();

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const loading = ref(true);

const userName = ref('');

onMounted(async () => {
  userName.value = await selfUserName().getAsync();

  loading.value = false;
});

async function sendJoinRequest() {
  try {
    const groupPublicKeyring = createPublicKeyring(
      await internals.realtime.hget('group', props.groupId, 'public-keyring'),
    );

    await requestWithNotifications({
      url: `/api/groups/${props.groupId}/join-requests/send`,

      body: {
        encryptedUserName: bytesToBase64(
          internals.keyPair.encrypt(
            textToBytes(userName.value),
            groupPublicKeyring,
            { padding: true },
          ),
        ),
        encryptedUserNameForUser: bytesToBase64(
          internals.symmetricKeyring.encrypt(textToBytes(userName.value), {
            padding: true,
            associatedData: {
              context: 'GroupJoinRequestUserNameForUser',
              groupId: props.groupId,
              userId: authStore().userId,
            },
          }),
        ),
      },

      notifications: {
        agent: {
          groupId: props.groupId,

          // You have sent a join request.
        },

        observers: {
          groupId: props.groupId,

          agentName: userName.value,

          // ${agentName} has sent a join request.
        },
      },
    });

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
