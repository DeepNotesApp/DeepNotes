<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { useSession } from "./useSession";

const router = useRouter();
const route = useRoute();

const {
  loading,
  lastError,
  twoFactorRequired,
  isAuthenticated,
  loginWithDemo,
  loginWithPassword,
  clearError,
} = useSession();

const email = ref("");
const password = ref("");
const rememberSession = ref(true);
const authenticatorToken = ref("");
const recoveryCode = ref("");

onMounted(() => {
  if (isAuthenticated.value) {
    void router.replace({ name: "home" });
  }
});

async function onDemo() {
  clearError();
  const { ok } = await loginWithDemo();
  if (ok) await router.push({ name: "home" });
}

async function onSubmit() {
  clearError();
  const { ok } = await loginWithPassword({
    email: email.value,
    password: password.value,
    rememberSession: rememberSession.value,
    authenticatorToken: twoFactorRequired.value
      ? authenticatorToken.value || undefined
      : undefined,
    recoveryCode: recoveryCode.value
      ? recoveryCode.value.trim().toLowerCase()
      : undefined,
  });
  if (ok) {
    const redirect = route.query.redirect;
    if (typeof redirect === "string" && redirect.startsWith("/")) {
      await router.push(redirect);
    } else {
      await router.push({ name: "home" });
    }
  }
}
</script>

<template>
  <section class="panel">
    <h1 class="title">Sign in</h1>
    <p v-if="lastError" class="err" role="alert">
      {{ lastError }}
    </p>

    <form class="form" @submit.prevent="onSubmit">
      <label class="field">
        <span>Email</span>
        <input
          v-model="email"
          autocomplete="username"
          :disabled="loading"
          name="email"
          required
          type="email"
        />
      </label>
      <label class="field">
        <span>Password</span>
        <input
          v-model="password"
          autocomplete="current-password"
          :disabled="loading"
          name="password"
          required
          type="password"
        />
      </label>
      <label class="check">
        <input v-model="rememberSession" :disabled="loading" type="checkbox" />
        Remember this device
      </label>

      <div v-if="twoFactorRequired" class="mfa">
        <p class="muted">
          Enter a 6-digit code from your authenticator app, or a recovery code.
        </p>
        <label class="field">
          <span>Authenticator code</span>
          <input
            v-model="authenticatorToken"
            autocomplete="one-time-code"
            :disabled="loading"
            inputmode="numeric"
            maxlength="6"
            pattern="[0-9]*"
            placeholder="000000"
            type="text"
          />
        </label>
        <label class="field">
          <span>Recovery code (optional)</span>
          <input
            v-model="recoveryCode"
            :disabled="loading"
            inputmode="text"
            maxlength="32"
            placeholder="32 hex characters"
            spellcheck="false"
            type="text"
          />
        </label>
      </div>

      <div class="actions">
        <button :disabled="loading" class="btn primary" type="submit">
          {{ loading ? "Signing in…" : "Sign in" }}
        </button>
        <button
          :disabled="loading"
          class="btn ghost"
          type="button"
          @click="onDemo"
        >
          Try demo
        </button>
      </div>
    </form>

    <p class="footer">
      <RouterLink to="/">Home</RouterLink>
    </p>
  </section>
</template>

<style scoped>
.panel {
  max-width: 22rem;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 1.25rem;
}

.err {
  color: #9a1c1c;
  background: #fce8e8;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.9rem;
  margin: 0 0 1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  font-weight: 600;
}

.field input {
  font: inherit;
  padding: 0.45rem 0.55rem;
  border: 1px solid #c8c8c8;
  border-radius: 0.375rem;
}

.check {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.mfa {
  padding-top: 0.25rem;
  border-top: 1px solid #e8e8e8;
  margin-top: 0.25rem;
}

.muted {
  color: #5c5c5c;
  font-size: 0.9rem;
  font-weight: 500;
  margin: 0 0 0.5rem;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.btn {
  font: inherit;
  padding: 0.5rem 0.9rem;
  border-radius: 0.375rem;
  border: 1px solid #c8c8c8;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  background: #1a1a7a;
  color: #fff;
  border-color: #1a1a7a;
}

.btn.primary:hover:not(:disabled) {
  background: #12125a;
}

.btn.ghost:hover:not(:disabled) {
  background: #f2f2f2;
}

.footer {
  margin: 1.5rem 0 0;
  font-size: 0.9rem;
}

.footer a {
  color: #1a1a7a;
}
</style>
