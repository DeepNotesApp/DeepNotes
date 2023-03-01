<template>
  <DeepBtn
    label="Make private"
    color="secondary"
    @click="makePrivate"
  />
</template>

<script setup lang="ts">
import type { GroupKeyRotationValues } from 'src/code/pages/group-key-rotation.client';
import { rotateGroupKeys } from 'src/code/pages/group-key-rotation.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

const groupId = inject<string>('groupId')!;

async function makePrivate() {
  try {
    await asyncPrompt({
      title: 'Make group private',
      message: 'Are you sure you want to make this group private?',

      focus: 'cancel',

      ok: { label: 'Yes', flat: true, color: 'negative' },
      cancel: { label: 'No', flat: true, color: 'primary' },
    });

    const response = (
      await api().post<GroupKeyRotationValues>(
        `/api/groups/${groupId}/privacy/make-private`,
        {},
      )
    ).data;

    if (response.rotateGroupKeys) {
      await api().post(
        `/api/groups/${groupId}/privacy/make-private`,
        await rotateGroupKeys(groupId, response),
      );
    }

    $quasar().notify({
      message: 'Group is now private.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
