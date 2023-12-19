<template>
  <DeepBtn
    label="Delete group"
    color="negative"
    @click="_deleteGroup()"
  />
</template>

<script setup lang="ts">
import { deleteGroup } from 'src/code/api-interface/groups/deletion/delete';
import { deleteGroupPermanently } from 'src/code/api-interface/groups/deletion/delete-permanently';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import DeletionDialog from 'src/components/DeletionDialog.vue';
import type { Ref } from 'vue';

const groupId = inject<string>('groupId')!;

const dialog = inject<Ref<InstanceType<typeof CustomDialog>>>('dialog')!;

async function _deleteGroup() {
  try {
    const { deletePermanently } = await asyncDialog({
      component: DeletionDialog,
      componentProps: { subject: 'group' },
    });

    if (deletePermanently) {
      await deleteGroupPermanently({ groupId });
    } else {
      await deleteGroup({ groupId });
    }

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
