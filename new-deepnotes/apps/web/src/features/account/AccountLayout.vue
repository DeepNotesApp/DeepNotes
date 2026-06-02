<script setup lang="ts">
import { watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { useSession } from "../auth/useSession";

const router = useRouter();
const route = useRoute();
const { bootstrapped, isAuthenticated, user, fetchMe } = useSession();

watch(
  [bootstrapped, isAuthenticated],
  async () => {
    if (!bootstrapped.value) {
      return;
    }
    if (!isAuthenticated.value) {
      void router.replace({
        name: "login",
        query: { redirect: "/account" },
      });
    } else if (user.value == null) {
      await fetchMe();
    }
  },
  { immediate: true },
);

const tabs = [
  { name: "General", to: "/account/general" },
  { name: "Security", to: "/account/security" },
  { name: "Billing", to: "/account/billing" },
];
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <h1 class="mb-6 text-2xl font-semibold tracking-tight">Account</h1>

    <div class="flex flex-col gap-8 md:flex-row">
      <!-- Sidebar -->
      <aside class="md:w-48 md:shrink-0">
        <nav class="flex flex-row gap-2 md:flex-col">
          <RouterLink
            v-for="tab in tabs"
            :key="tab.to"
            :to="tab.to"
            :class="[
              'rounded-md px-3 py-2 text-sm font-medium transition-colors',
              route.path === tab.to || (tab.to === '/account/general' && route.path === '/account')
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            ]"
          >
            {{ tab.name }}
          </RouterLink>
        </nav>
      </aside>

      <!-- Content -->
      <div class="min-w-0 flex-1">
        <RouterView />
      </div>
    </div>
  </div>
</template>
