<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";

import { Button } from "@/components/ui/button";

import { useSession } from "./features/auth/useSession";

const { bootstrap, isAuthenticated, user, bootstrapped, loading, logout } =
  useSession();
const route = useRoute();

onMounted(() => {
  void bootstrap();
});

async function onLogout() {
  await logout();
}
</script>

<template>
  <div
    v-if="!bootstrapped"
    class="text-muted-foreground flex min-h-svh items-center justify-center p-4 text-sm"
  >
    Loading session…
  </div>
  <div
    v-else
    class="app-root bg-background text-foreground flex min-h-svh flex-col"
  >
    <header
      class="bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur"
    >
      <div
        class="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <RouterLink
          class="text-foreground text-base font-bold tracking-tight"
          to="/"
        >
          DeepNotes
        </RouterLink>
        <nav class="flex items-center gap-2 text-sm">
          <span
            v-if="isAuthenticated && user"
            class="text-muted-foreground text-xs font-medium"
          >
            {{ user.demo ? "Demo" : "Signed in" }}
          </span>
          <Button
            v-if="isAuthenticated"
            as-child
            size="sm"
            variant="ghost"
          >
            <RouterLink to="/pages">Pages</RouterLink>
          </Button>
          <Button
            v-if="isAuthenticated"
            as-child
            size="sm"
            variant="ghost"
          >
            <RouterLink to="/groups">Groups</RouterLink>
          </Button>
          <Button
            v-if="isAuthenticated"
            as-child
            size="sm"
            variant="ghost"
          >
            <RouterLink to="/notifications">Notifications</RouterLink>
          </Button>
          <template v-if="!isAuthenticated">
            <Button as-child variant="ghost" size="sm">
              <RouterLink to="/register">Register</RouterLink>
            </Button>
            <Button as-child variant="ghost" size="sm">
              <RouterLink to="/login">Sign in</RouterLink>
            </Button>
          </template>
          <Button
            v-else
            :disabled="loading"
            size="sm"
            variant="ghost"
            @click="onLogout"
          >
            Sign out
          </Button>
        </nav>
      </div>
    </header>
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <RouterView :key="route.path" />
    </main>
  </div>
</template>
