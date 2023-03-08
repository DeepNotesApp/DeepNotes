<template>
  <DeepBtn
    label="Make group public"
    color="negative"
    @click="makePublic"
  />
</template>

<script setup lang="ts">
import { bytesToBase64 } from '@stdlib/base64';
import { DataLayer } from '@stdlib/crypto';
import { groupAccessKeyrings } from 'src/code/pages/computed/group-access-keyrings.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

const groupId = inject<string>('groupId')!;

async function makePublic() {
  try {
    await asyncPrompt({
      title: 'Make group public',
      message: 'Are you sure you want to make this group public?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const accessKeyring = await groupAccessKeyrings()(groupId).getAsync();

    if (accessKeyring?.topLayer !== DataLayer.Raw) {
      throw new Error('Invalid group keyring.');
    }

    await api().post(`/api/groups/${groupId}/privacy/make-public`, {
      accessKeyring: bytesToBase64(accessKeyring.fullValue),
    });

    $quasar().notify({
      message: 'Group is now public.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
