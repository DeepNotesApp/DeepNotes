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
import 'cordova-plugin-purchase';

import { watchUntilTrue } from '@stdlib/vue';

useMeta(() => ({
  title: 'Billing - Account - DeepNotes',
}));

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});

if (
  process.env.CLIENT &&
  $quasar().platform.is.capacitor &&
  $quasar().platform.is.ios
) {
  document.addEventListener('deviceready', async () => {
    CdvPurchase.store.applicationUsername = () => authStore().userId;

    CdvPurchase.store.register([
      {
        id: 'ProPlan',
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      },
      {
        id: 'pro_plan_yearly',
        platform: CdvPurchase.Platform.APPLE_APPSTORE,
        type: CdvPurchase.ProductType.PAID_SUBSCRIPTION,
      },
    ]);

    CdvPurchase.store.when().approved(async (cb) => {
      mainLogger.info('Purchase approved %o', cb);

      await cb.finish();
    });

    await CdvPurchase.store.initialize([CdvPurchase.Platform.APPLE_APPSTORE]);
  });
}

async function createPortalSession() {
  if ($quasar().platform.is.capacitor && $quasar().platform.is.ios) {
    await CdvPurchase.store.products
      .find((p) => p.owned)
      ?.getOffer()
      ?.order();
  } else {
    const { portalSessionUrl } =
      await trpcClient.users.account.stripe.createPortalSession.mutate();

    location.href = portalSessionUrl;
  }
}
</script>
