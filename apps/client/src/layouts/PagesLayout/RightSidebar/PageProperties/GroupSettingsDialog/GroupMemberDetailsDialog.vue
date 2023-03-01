<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 300px"
  >
    <template #header>
      <q-card-section
        style="padding: 12px 20px"
        class="text-h6"
      >
        User details
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="position: relative; padding: 20px">
        <TextField
          label="User display name"
          dense
          :model-value="groupMemberNames()(`${groupId}:${userId}`).get().text"
          copy-btn
          readonly
        />

        <Gap style="height: 16px" />

        <TextField
          label="User ID"
          dense
          :model-value="userId"
          copy-btn
          readonly
        />

        <Gap style="height: 16px" />

        <TextField
          label="User public key"
          dense
          :model-value="userPublicKeyBase64"
          copy-btn
          readonly
        />

        <LoadingOverlay v-if="realtimeCtx.loading" />
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          label="Close"
          type="submit"
          flat
          color="primary"
          @click.prevent="dialogRef.onDialogOK()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { bytesToBase64 } from '@stdlib/base64';
import { createPublicKeyring } from '@stdlib/crypto';
import { groupMemberNames } from 'src/code/pages/computed/group-member-names.client';
import { useRealtimeContext } from 'src/code/realtime/context.universal';
import type { Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const realtimeCtx = useRealtimeContext();

const props = defineProps<{
  groupId: string;
  userId: string;
}>();

const userPublicKeyBase64 = computed(() => {
  const publicKeyringBytes = realtimeCtx.hget(
    'user',
    props.userId,
    'public-keyring',
  );

  if (publicKeyringBytes == null) {
    return '';
  }

  const publicKeyring = createPublicKeyring(publicKeyringBytes);

  return bytesToBase64(publicKeyring.value);
});
</script>
