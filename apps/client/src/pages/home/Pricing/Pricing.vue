<template>
  <q-page>
    <Gap style="height: 96px" />

    <div style="font-size: 45px; font-weight: bold; text-align: center">
      Pricing Plans
    </div>

    <Gap style="height: 56px" />

    <div
      class="row"
      style="justify-content: center"
    >
      <PlanCard
        title="Basic"
        :price="0"
        :features="[
          {
            icon: 'mdi-note',
            text: 'Create up to 10 pages',
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
        :price="8"
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

        <form
          v-else-if="plan !== 'pro'"
          :action="`${appServerURL}/api/stripe/create-checkout-session`"
          method="POST"
          style="display: flex"
        >
          <input
            type="hidden"
            name="plan"
            value="pro"
          />

          <input
            type="hidden"
            name="returnUrl"
            :value="global.location?.href"
          />

          <DeepBtn
            label="Choose"
            color="primary"
            type="submit"
            style="flex: 1"
          />
        </form>

        <form
          v-else
          :action="`${appServerURL}/api/stripe/create-portal-session`"
          method="POST"
          style="display: flex"
        >
          <input
            type="hidden"
            name="returnUrl"
            :value="global.location?.href"
          />

          <DeepBtn
            label="Manage"
            color="primary"
            type="submit"
            style="flex: 1"
          />
        </form>
      </PlanCard>
    </div>

    <Gap style="height: 128px" />

    <ViewportLoadingOverlay v-if="loading" />
  </q-page>
</template>

<script setup lang="ts">
import { watchUntilTrue } from '@stdlib/vue';

import PlanCard from './PlanCard.vue';

const appServerURL = process.env.APP_SERVER_URL;

const plan = computed(() =>
  internals.realtime.globalCtx.hget('user', authStore().userId, 'plan'),
);

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});
</script>
