<template>
  <DeepBtn
    label="Change group password"
    color="primary"
    @click="changeGroupPassword()"
  />
</template>

<script setup lang="ts">
import { changeGroupPasswordProtection } from 'src/code/api-interface/groups/password/change';
import { asyncPrompt, handleError } from 'src/code/utils/misc.js';

const groupId = inject<string>('groupId')!;

async function changeGroupPassword() {
  try {
    const currentGroupPassword = await asyncPrompt<string>({
      title: 'Change group password',
      message: 'Enter the current group password:',
      color: 'primary',
      prompt: {
        type: 'password',
        model: '',
        filled: true,
      },
      style: {
        maxWidth: '350px',
      },
      cancel: true,
    });

    const newGroupPassword = await asyncPrompt<string>({
      title: 'Change group password',
      message: 'Enter the new group password:',
      color: 'primary',
      prompt: {
        type: 'password',
        model: '',
        filled: true,
      },
      style: {
        maxWidth: '350px',
      },
      cancel: true,
    });

    await changeGroupPasswordProtection({
      groupId,
      currentGroupPassword,
      newGroupPassword,
    });

    $quasar().notify({
      message: 'Group password changed successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
