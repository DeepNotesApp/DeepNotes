<template>
  <DeepBtn
    label="Rotate encryption keys"
    color="primary"
    @click="_rotateGroupKeys()"
  />
</template>

<script setup lang="ts">
import type { GroupKeyRotationValues } from 'src/code/pages/group-key-rotation.client';
import { rotateGroupKeys } from 'src/code/pages/group-key-rotation.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

const groupId = inject<string>('groupId')!;

async function _rotateGroupKeys() {
  try {
    await asyncPrompt({
      title: 'Rotate encryption keys',
      message: 'Are you sure you want to rotate the group encryption keys?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const groupKeyRotationValues = (
      await api().post<GroupKeyRotationValues>(
        `/api/groups/${groupId}/rotate-keys`,
        {},
      )
    ).data;

    await api().post(
      `/api/groups/${groupId}/rotate-keys`,
      await rotateGroupKeys(groupId, groupKeyRotationValues),
    );
  } catch (error: any) {
    handleError(error);
  }
}
</script>
