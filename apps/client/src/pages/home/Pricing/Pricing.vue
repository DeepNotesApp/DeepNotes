<template>
  <q-page>
    <Gap style="height: 120px" />

    <div style="font-size: 45px; font-weight: bold; text-align: center">
      Pricing Plans
    </div>

    <Gap style="height: 52px" />

    <div style="display: flex; justify-content: center">
      <BillingFrequencyToggle v-model="billingFrequency" />
    </div>

    <Gap style="height: 62px" />

    <div
      class="row"
      style="justify-content: center"
    >
      <PlanCard
        title="Basic"
        monthly-price="0"
        :features="[
          {
            icon: 'mdi-note',
            text: 'Create up to 50 pages',
          },
          {
            icon: 'mdi-server-security',
            text: 'End-to-end encryption',
          },
          {
            icon: 'mdi-axis-arrow',
            text: 'Spatial note-taking',
          },
          {
            icon: 'mdi-graph-outline',
            text: 'Graph-based navigation',
          },
          {
            icon: 'mdi-cellphone-link',
            text: 'Collaborate between devices',
          },
          {
            icon: 'mdi-shield-account',
            text: 'Two-factor authentication',
          },
        ]"
      >
        <DeepBtn
          v-if="!authStore().loggedIn"
          label="Choose"
          color="primary"
          :to="{ name: 'register' }"
        />

        <DeepBtn
          v-else-if="plan !== 'pro'"
          label="Current"
          color="primary"
          disable
        />

        <DeepBtn
          v-else
          style="visibility: hidden"
        />
      </PlanCard>

      <PlanCard
        title="Pro"
        :monthly-price="billingFrequency === 'monthly' ? '4.99' : '3.99'"
        :billing-frequency="billingFrequency"
        previous="Basic"
        :features="[
          {
            icon: 'mdi-note',
            text: 'Unlimited pages',
          },
          {
            icon: 'mdi-account-group',
            text: 'Collaborative groups',
          },
          {
            icon: 'mdi-earth',
            text: 'Private and public groups',
            help: 'Public groups are viewable by anyone, but only editable by the group members.',
          },
          {
            icon: 'mdi-lock',
            text: 'Password protected groups',
          },
          {
            icon: 'mdi-account-supervisor',
            text: 'Manage user roles',
          },
          {
            icon: 'mdi-history',
            text: '14-day page history',
          },
        ]"
      >
        <DeepBtn
          v-if="!authStore().loggedIn"
          label="Choose"
          color="primary"
          :to="{ name: 'register', query: { plan: 'pro' } }"
        />

        <DeepBtn
          v-else-if="plan !== 'pro'"
          label="Choose"
          color="primary"
          type="submit"
          style="flex: 1"
          @click="createCheckoutSession()"
        />

        <DeepBtn
          v-else
          label="Manage"
          color="primary"
          type="submit"
          style="flex: 1"
          @click="createPortalSession()"
        />
      </PlanCard>
    </div>

    <Gap style="height: 128px" />

    <ViewportLoadingOverlay v-if="loading" />
  </q-page>
</template>

<script setup lang="ts">
import 'cordova-plugin-purchase';

import { watchUntilTrue } from '@stdlib/vue';
import { handleError } from 'src/code/utils/misc';

import PlanCard from './PlanCard.vue';

const billingFrequency = ref<'monthly' | 'yearly'>('monthly');

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

const plan = computed(() =>
  internals.realtime.globalCtx.hget('user', authStore().userId, 'plan'),
);

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});

async function createCheckoutSession() {
  try {
    // $quasar().notify({
    //   html: true,
    //   message: `Is iOS capacitor: ${
    //     $quasar().platform.is.capacitor && $quasar().platform.is.ios
    //   }<br/>
    //   Num products: ${CdvPurchase.store.products.length}`,
    // });

    if ($quasar().platform.is.capacitor && $quasar().platform.is.ios) {
      let product: CdvPurchase.Product | undefined;

      if (billingFrequency.value === 'monthly') {
        product = CdvPurchase.store.products.find((p) => p.id === 'ProPlan');
      } else {
        product = CdvPurchase.store.products.find(
          (p) => p.id === 'pro_plan_yearly',
        );
      }

      // $quasar().notify({
      //   message: `Found product: ${product != null}`,
      // });

      await product?.getOffer()?.order();
    } else {
      const { checkoutSessionUrl } =
        await trpcClient.users.account.stripe.createCheckoutSession.mutate({
          billingFrequency: billingFrequency.value,
        });

      window.open(checkoutSessionUrl, '_blank');
    }
  } catch (error) {
    handleError(error);
  }
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

    window.open(portalSessionUrl, '_blank');
  }
}
</script>
