<template>
  <DeepBtn
    label="Delete group"
    color="negative"
    @click="deleteGroup()"
  />
</template>

<script setup lang="ts">
import { asyncPrompt, handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

const groupId = inject<string>('groupId')!;

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

async function deleteGroup() {
  try {
    await asyncPrompt({
      title: 'Delete group',
      message: 'Are you sure you want to delete this group?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await api().post(`/api/groups/${groupId}/deletion/delete`);

    $quasar().notify({
      message: 'Group deleted successfully.',
      color: 'positive',
    });

    dialog.value.onDialogOK();
  } catch (error) {
    handleError(error);
  }
}
</script>
