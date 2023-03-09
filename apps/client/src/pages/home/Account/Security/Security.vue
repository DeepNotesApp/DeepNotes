<template>
  <h5 style="margin-block-start: 0; margin-block-end: 0">Change password</h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <ChangePassword />

  <Gap style="height: 72px" />

  <h5 style="margin-block-start: 0; margin-block-end: 0">
    Two-factor authentication
  </h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <TwoFactorAuth />

  <Gap style="height: 72px" />

  <h5 style="margin-block-start: 0; margin-block-end: 0">
    Rotate encryption keys
  </h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <RotateKeys />

  <LoadingOverlay v-if="loading" />
</template>

<script setup lang="ts">
import { watchUntilTrue } from '@stdlib/vue';

import ChangePassword from './ChangePassword.vue';
import RotateKeys from './RotateKeys.vue';
import TwoFactorAuth from './TwoFactorAuth/TwoFactorAuth.vue';

useMeta(() => ({
  title: 'Security - Account - DeepNotes',
}));

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});
</script>
