<template>
  <h5 style="margin-block-start: 0; margin-block-end: 0">Email</h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <ChangeEmail />

  <Gap style="height: 72px" />

  <h5 style="margin-block-start: 0; margin-block-end: 0">Danger zone</h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <DeleteAccount />

  <LoadingOverlay v-if="loading" />
</template>

<script setup lang="ts">
import { watchUntilTrue } from '@stdlib/vue';

import ChangeEmail from './ChangeEmail.vue';
import DeleteAccount from './DeleteAccount.vue';

useMeta(() => ({
  title: 'General - Account - DeepNotes',
}));

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});
</script>
