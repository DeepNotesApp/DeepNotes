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

    <template v-if="$q.platform.is.capacitor && $q.platform.is.ios">
      <Gap style="height: 16px" />

      <DeepBtn
        label="Restore Apple purchases"
        color="secondary"
        @click="
          async () => {
            try {
              const customerInfo = await Purchases.restorePurchases();

              $q.notify({
                message: 'Apple purchases restored successfully.',
                color: 'positive',
              });
            } catch (error) {
              handleError(error);
            }
          }
        "
      />
    </template>
  </div>

  <LoadingOverlay v-if="loading" />
</template>

<script setup lang="ts">
import { LOG_LEVEL, Purchases } from '@revenuecat/purchases-capacitor';
import { watchUntilTrue } from '@stdlib/vue';
import { handleError } from 'src/code/utils/misc';

useMeta(() => ({
  title: 'Billing - Account - DeepNotes',
}));

if (
  process.env.CLIENT &&
  $quasar().platform.is.capacitor &&
  $quasar().platform.is.ios
) {
  document.addEventListener(
    'deviceready',
    async () => {
      await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG }); // Enable to get debug logs
      await Purchases.configure({
        apiKey: process.env.REVENUECAT_PUBLIC_APPLE_API_KEY,
        appUserID: authStore().userId,
      });
    },
    false,
  );
}

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});

async function createPortalSession() {
  const { portalSessionUrl } =
    await trpcClient.users.account.stripe.createPortalSession.mutate();

  location.href = portalSessionUrl;
}
</script>
