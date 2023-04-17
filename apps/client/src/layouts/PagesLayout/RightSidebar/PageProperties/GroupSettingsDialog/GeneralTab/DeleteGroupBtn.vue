<template>
  <DeepBtn
    label="Delete group"
    color="negative"
    @click="_deleteGroup()"
  />
</template>

<script setup lang="ts">
import { deleteGroup } from 'src/code/api-interface/groups/deletion/delete';
import { asyncPrompt, handleError } from 'src/code/utils/misc.js';
import type { Ref } from 'vue';

const groupId = inject<string>('groupId')!;

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

async function _deleteGroup() {
  try {
    await asyncPrompt({
      title: 'Delete group',
      message: 'Are you sure you want to delete this group?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await deleteGroup(groupId);

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
