<template>
  <DeepBtn
    label="Disable password protection"
    color="negative"
    @click="disablePasswordProtection()"
  />
</template>

<script setup lang="ts">
import { disableGroupPasswordProtection } from 'src/code/api-interface/groups/password/disable';
import { asyncPrompt, handleError } from 'src/code/utils';

const groupId = inject<string>('groupId')!;

async function disablePasswordProtection() {
  try {
    const groupPassword = await asyncPrompt<string>({
      title: 'Disable password protection',
      message: 'Enter the group password:',
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

    await disableGroupPasswordProtection(groupId, { groupPassword });

    $quasar().notify({
      message: 'Group password protection disabled successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
