<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";

import { useSession } from "./features/auth/useSession";

const { bootstrap, isAuthenticated, user, bootstrapped, loading, logout } =
  useSession();

onMounted(() => {
  void bootstrap();
});

async function onLogout() {
  await logout();
}
</script>

<template>
  <div v-if="!bootstrapped" class="app-loading">Loading session…</div>
  <div v-else class="app">
    <header class="header">
      <RouterLink class="brand" to="/">DeepNotes</RouterLink>
      <nav class="nav">
        <span v-if="isAuthenticated && user" class="tag">
          {{ user.demo ? "Demo" : "Signed in" }}
        </span>
        <RouterLink v-if="!isAuthenticated" to="/login">Sign in</RouterLink>
        <button
          v-else
          :disabled="loading"
          class="linkish"
          type="button"
          @click="onLogout"
        >
          Sign out
        </button>
      </nav>
    </header>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-loading {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1rem;
  color: #5c5c5c;
}

.app {
  font-family: system-ui, -apple-system, sans-serif;
  min-height: 100vh;
  line-height: 1.5;
  color: #1a1a1a;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #e4e4e4;
  background: #fafafa;
}

.brand {
  font-weight: 800;
  font-size: 1.15rem;
  color: #1a1a7a;
  text-decoration: none;
}

.brand:hover {
  text-decoration: underline;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.95rem;
}

.nav a {
  color: #1a1a7a;
  text-decoration: none;
  font-weight: 600;
}

.nav a:hover {
  text-decoration: underline;
}

.tag {
  font-size: 0.8rem;
  color: #5c5c5c;
  font-weight: 600;
}

.linkish {
  font: inherit;
  font-weight: 600;
  color: #1a1a7a;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.linkish:hover:not(:disabled) {
  text-decoration: underline;
}

.linkish:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.main {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 2rem;
}
</style>
