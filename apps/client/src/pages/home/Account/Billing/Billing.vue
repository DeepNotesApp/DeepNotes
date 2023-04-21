<template>
  <h5 style="margin-block-start: 0; margin-block-end: 0">Subscription</h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <div>
    <DeepBtn
      v-if="
        internals.realtime.globalCtx.hget(
          'user',
          authStore().userId,
          'plan',
        ) !== 'pro'
      "
      label="See subscription plans"
      color="primary"
      :to="{ name: 'pricing' }"
    />

    <DeepBtn
      v-else
      label="Manage subscription"
      color="secondary"
      type="submit"
      @click="createPortalSession()"
    />
  </div>

  <LoadingOverlay v-if="loading" />
</template>

<script setup lang="ts">
import { watchUntilTrue } from '@stdlib/vue';

useMeta(() => ({
  title: 'Billing - Account - DeepNotes',
}));

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});

async function createPortalSession() {
  const { portalSessionUrl } =
    await trpcClient.users.account.stripe.createPortalSession.mutate({
      returnUrl: location.href,
    });

  location.href = portalSessionUrl;
}
</script>
