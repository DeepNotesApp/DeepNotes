<template>
  <DeepBtn
    label="Make group private"
    color="secondary"
    @click="makePrivate"
  />
</template>

<script setup lang="ts">
import { makeGroupPrivate } from 'src/code/api-interface/groups/privacy/make-private';
import { asyncDialog, handleError } from 'src/code/utils/misc';

const groupId = inject<string>('groupId')!;

async function makePrivate() {
  try {
    await asyncDialog({
      title: 'Make group private',
      message: 'Are you sure you want to make this group private?',

      focus: 'cancel',

      ok: { label: 'Yes', flat: true, color: 'negative' },
      cancel: { label: 'No', flat: true, color: 'primary' },
    });

    await makeGroupPrivate({ groupId });

    $quasar().notify({
      message: 'Group is now private.',
      color: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
