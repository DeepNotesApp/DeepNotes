<script setup lang="ts">
import { computed, onMounted } from "vue";
import { RouterView, useRoute } from "vue-router";

import AuthLayout from "@/layouts/AuthLayout.vue";
import DefaultLayout from "@/layouts/DefaultLayout.vue";
import PageLayout from "@/layouts/PageLayout.vue";

import { useSession } from "./features/auth/useSession";
import {
  realtimeToastMessage,
  useRealtimeUserChannel,
} from "./features/realtime/useRealtimeUserChannel";

const { bootstrap, user, bootstrapped } = useSession();
useRealtimeUserChannel(user);
const route = useRoute();

const layout = computed(() => {
  if (route.meta.layout === "auth") return AuthLayout;
  if (route.meta.layout === "page") return PageLayout;
  return DefaultLayout;
});

onMounted(() => {
  void bootstrap();
});
</script>

<template>
  <component :is="layout" data-testid="app-shell">
    <div
      v-if="!bootstrapped"
      class="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm"
    >
      Loading session…
    </div>
    <RouterView v-else :key="route.path" />
  </component>
  <div
    v-if="realtimeToastMessage"
    class="bg-card fixed bottom-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-md border px-4 py-2 text-sm shadow-lg"
    role="status"
  >
    {{ realtimeToastMessage }}
  </div>
</template>
