<template>
  <DeepBtn
    label="Rotate encryption keys"
    color="primary"
    @click="_rotateGroupKeys()"
  />
</template>

<script setup lang="ts">
import { rotateGroupKeys } from 'src/code/pages/operations/groups/key-rotation';
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

    await rotateGroupKeys(groupId);
  } catch (error: any) {
    handleError(error);
  }
}
</script>
