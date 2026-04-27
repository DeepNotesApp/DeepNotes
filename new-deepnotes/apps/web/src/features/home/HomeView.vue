<script setup lang="ts">
import { RouterLink } from "vue-router";

import { useSession } from "../auth/useSession";

const { user, loading, bootstrapped, isAuthenticated } = useSession();
</script>

<template>
  <section class="panel">
    <p v-if="!bootstrapped || loading" class="muted">Loading session…</p>
    <template v-else-if="isAuthenticated && user">
      <p class="lead">Signed in</p>
      <dl class="kv">
        <dt>User</dt>
        <dd>
          <code>{{ user.userId }}</code>
        </dd>
        <dt>Email verified</dt>
        <dd>{{ user.emailVerified ? "yes" : "no" }}</dd>
        <dt>Demo</dt>
        <dd>{{ user.demo ? "yes" : "no" }}</dd>
        <dt>Personal group</dt>
        <dd>
          <code>{{ user.personalGroupId }}</code>
        </dd>
      </dl>
    </template>
    <template v-else>
      <p class="lead">Welcome</p>
      <p class="muted">
        Sign in to continue. The API sets httpOnly cookies; the
        <code>loggedIn</code> hint cookie drives client UI.
      </p>
      <RouterLink class="btn primary" to="/login">Sign in</RouterLink>
    </template>
  </section>
</template>

<style scoped>
.panel {
  max-width: 32rem;
}

.lead {
  font-size: 1.125rem;
  margin: 0 0 1rem;
}

.muted {
  color: #5c5c5c;
  margin: 0 0 1rem;
}

.kv {
  display: grid;
  grid-template-columns: 10rem 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
  font-size: 0.95rem;
}

.kv dt {
  margin: 0;
  color: #5c5c5c;
}

.kv dd {
  margin: 0;
  font-family: ui-monospace, monospace;
  word-break: break-all;
}

.btn {
  display: inline-block;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  text-decoration: none;
  font-weight: 600;
}

.btn.primary {
  background: #1a1a7a;
  color: #fff;
}

.btn.primary:hover {
  background: #12125a;
}
</style>
