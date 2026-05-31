<script setup lang="ts">
import { onMounted } from "vue";
import { RouterView, useRoute } from "vue-router";

import DefaultLayout from "@/layouts/DefaultLayout.vue";

import { useSession } from "./features/auth/useSession";
import {
  realtimeToastMessage,
  useRealtimeUserChannel,
} from "./features/realtime/useRealtimeUserChannel";

const { bootstrap, user, bootstrapped } = useSession();
useRealtimeUserChannel(user);
const route = useRoute();

onMounted(() => {
  void bootstrap();
});
</script>

<template>
  <DefaultLayout data-testid="app-shell">
    <div
      v-if="!bootstrapped"
      class="text-muted-foreground flex min-h-[40vh] items-center justify-center text-sm"
    >
      Loading session…
    </div>
    <RouterView v-else :key="route.path" />
  </DefaultLayout>
  <div
    v-if="realtimeToastMessage"
    class="bg-card fixed bottom-4 left-1/2 z-50 max-w-md -translate-x-1/2 rounded-md border px-4 py-2 text-sm shadow-lg"
    role="status"
  >
    {{ realtimeToastMessage }}
  </div>
</template>
