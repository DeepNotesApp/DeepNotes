<script setup lang="ts">
import { watch } from "vue";
import { useRouter } from "vue-router";

import { useSession } from "../auth/useSession";

const router = useRouter();
const { client, bootstrapped, isAuthenticated } = useSession();

async function resolveAndGo() {
  if (!bootstrapped.value) {
    return;
  }
  if (!isAuthenticated.value) {
    await router.replace({ name: "login", query: { redirect: "/pages" } });
    return;
  }

  const { data, response } = await client.GET("/api/users/me/pages/starting", {});
  if (response.status === 200 && data?.startingPageId) {
    await router.replace({
      name: "page",
      params: { pageId: data.startingPageId },
    });
    return;
  }

  await router.replace({ name: "home" });
}

watch(
  bootstrapped,
  (ok) => {
    if (ok) {
      void resolveAndGo();
    }
  },
  { immediate: true },
);
</script>

<template>
  <p class="text-muted-foreground text-sm">Opening your page…</p>
</template>
