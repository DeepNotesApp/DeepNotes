<template>
  <Checkbox
    @update:model-value="(value) => setJoinRequestsAllowed(value)"
    :model-value="
      internals.realtime.globalCtx.hget(
        'group',
        groupId,
        'are-join-requests-allowed',
      )
    "
    label="Allow join requests"
  />
</template>

<script setup lang="ts">
import { handleError } from 'src/code/utils/misc';

const groupId = inject<string>('groupId')!;

async function setJoinRequestsAllowed(value: boolean) {
  try {
    await trpcClient.groups.privacy.setJoinRequestsAllowed.mutate({
      groupId,

      areJoinRequestsAllowed: value,
    });

    if (value) {
      $quasar().notify({
        message: 'Join requests are now enabled in this group.',
        type: 'positive',
      });
    } else {
      $quasar().notify({
        message: 'Join requests are now disabled in this group.',
        type: 'positive',
      });
    }
  } catch (error) {
    handleError(error);
  }
}
</script>
