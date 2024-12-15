<template>
  <DeepBtn
    label="Make group public"
    color="negative"
    @click="makePublic"
  />
</template>

<script setup lang="ts">
import { makeGroupPublic } from 'src/code/areas/api-interface/groups/privacy/make-public';
import { asyncDialog, handleError } from 'src/code/utils/misc';

const groupId = inject<string>('groupId')!;

async function makePublic() {
  try {
    await asyncDialog({
      title: 'Make group public',
      message: 'Are you sure you want to make this group public?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await makeGroupPublic({ groupId });

    $quasar().notify({
      message: 'Group is now public.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
