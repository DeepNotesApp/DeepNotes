<template>
  <DeepBtn
    label="Enable password protection"
    color="primary"
    @click="enablePasswordProtection()"
  />
</template>

<script setup lang="ts">
import { enableGroupPasswordProtection } from 'src/code/api-interface/groups/password/enable';
import { asyncPrompt, handleError } from 'src/code/utils/misc';

import EnablePasswordDialog from './EnablePasswordDialog.vue';

const groupId = inject<string>('groupId')!;

async function enablePasswordProtection() {
  try {
    const groupPassword = await asyncPrompt<string>({
      component: EnablePasswordDialog,
    });

    await enableGroupPasswordProtection({
      groupId,
      groupPassword,
    });

    $quasar().notify({
      message: 'Group password protection enabled successfully.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
