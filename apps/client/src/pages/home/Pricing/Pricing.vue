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
          @click="choosePlan()"
        />

        <DeepBtn
          v-else
          label="Manage"
          color="primary"
          type="submit"
          style="flex: 1"
          @click="manageSubscription()"
        />
      </PlanCard>
    </div>

    <Gap style="height: 128px" />

    <ViewportLoadingOverlay v-if="loading" />
  </q-page>
</template>

<script setup lang="ts">
import {
  LOG_LEVEL,
  Purchases,
  PURCHASES_ERROR_CODE,
} from '@revenuecat/purchases-capacitor';
import { createSmartComputed, watchUntilTrue } from '@stdlib/vue';
import { handleError } from 'src/code/utils/misc';

import PlanCard from './PlanCard.vue';

const billingFrequency = ref<'monthly' | 'yearly'>('monthly');

const plan = computed(() =>
  internals.realtime.globalCtx.hget('user', authStore().userId, 'plan'),
);

const loading = ref(true);

if (
  process.env.CLIENT &&
  $quasar().platform.is.capacitor &&
  $quasar().platform.is.ios &&
  authStore().loggedIn
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

const offerings = createSmartComputed({
  get: async () => {
    try {
      const offerings = await Purchases.getOfferings();

      mainLogger.info('Offerings: %o', offerings);

      return offerings;
    } catch (error) {
      handleError(error);
    }
  },
});

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});

async function choosePlan() {
  if ($quasar().platform.is.capacitor && $quasar().platform.is.ios) {
    await buyPackage();
  } else {
    await createCheckoutSession();
  }
}

async function createCheckoutSession() {
  const { checkoutSessionUrl } =
    await trpcClient.users.account.stripe.createCheckoutSession.mutate({
      billingFrequency: billingFrequency.value,
    });

  window.open(checkoutSessionUrl, '_blank');
}

async function buyPackage() {
  try {
    const packages = (await offerings?.getAsync())?.current?.availablePackages;

    let pkg;

    if (billingFrequency.value === 'monthly') {
      pkg = packages?.find((pkg) => pkg.identifier === '$rc_monthly')!;
    } else {
      pkg = packages?.find((pkg) => pkg.identifier === '$rc_annual')!;
    }

    await Purchases.purchasePackage({
      aPackage: pkg,
    });
  } catch (error: any) {
    if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      // Purchase cancelled
    } else {
      // Error making purchase

      handleError(error);
    }
  }
}

async function manageSubscription() {
  if ($quasar().platform.is.capacitor && $quasar().platform.is.ios) {
    await buyPackage();
  } else {
    await createPortalSession();
  }
}

async function createPortalSession() {
  const { portalSessionUrl } =
    await trpcClient.users.account.stripe.createPortalSession.mutate();

  window.open(portalSessionUrl, '_blank');
}
</script>
