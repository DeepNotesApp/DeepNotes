<template>
  <h5 style="margin-block-start: 0; margin-block-end: 0">Subscription</h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <div
    v-if="
      internals.realtime.globalCtx.hget('user', authStore().userId, 'plan') !==
      'pro'
    "
  >
    <DeepBtn
      label="See subscription plans"
      color="primary"
      :to="{ name: 'pricing' }"
    />
  </div>
  <form
    v-else
    :action="`${appServerURL}/api/stripe/create-portal-session`"
    method="POST"
  >
    <input
      type="hidden"
      name="returnUrl"
      :value="global.location?.href"
    />

    <DeepBtn
      label="Manage subscription"
      color="secondary"
      type="submit"
    />
  </form>

  <LoadingOverlay v-if="loading" />
</template>

<script setup lang="ts">
import { watchUntilTrue } from '@stdlib/vue';

const appServerURL = process.env.APP_SERVER_URL;

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});
</script>
