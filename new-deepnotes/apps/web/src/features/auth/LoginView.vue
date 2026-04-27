<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

const registeredOk = computed(() => route.query.registered === "1");

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
  <div class="mx-auto w-full max-w-md">
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use your account email and password, or start a local demo session.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert
          v-if="registeredOk"
          class="mb-4"
          role="status"
        >
          <AlertDescription>
            Account created. Sign in with the same email and password.
          </AlertDescription>
        </Alert>

        <Alert
          v-if="lastError"
          class="mb-4"
          role="alert"
          variant="destructive"
        >
          <AlertDescription>
            {{ lastError }}
          </AlertDescription>
        </Alert>

        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="login-email">Email</Label>
            <Input
              id="login-email"
              v-model="email"
              autocomplete="username"
              :disabled="loading"
              name="email"
              required
              type="email"
            />
          </div>
          <div class="space-y-2">
            <Label for="login-password">Password</Label>
            <Input
              id="login-password"
              v-model="password"
              autocomplete="current-password"
              :disabled="loading"
              name="password"
              required
              type="password"
            />
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="remember"
              v-model:checked="rememberSession"
              :disabled="loading"
            />
            <Label
              class="text-muted-foreground font-normal"
              for="remember"
            >
              Remember this device
            </Label>
          </div>

          <div
            v-if="twoFactorRequired"
            class="border-border space-y-3 border-t pt-4"
          >
            <p class="text-muted-foreground text-sm">
              Enter a 6-digit code from your authenticator app, or a recovery
              code.
            </p>
            <div class="space-y-2">
              <Label for="login-otp">Authenticator code</Label>
              <Input
                id="login-otp"
                v-model="authenticatorToken"
                autocomplete="one-time-code"
                :disabled="loading"
                inputmode="numeric"
                maxlength="6"
                pattern="[0-9]*"
                placeholder="000000"
                type="text"
              />
            </div>
            <div class="space-y-2">
              <Label for="login-recovery">Recovery code (optional)</Label>
              <Input
                id="login-recovery"
                v-model="recoveryCode"
                :disabled="loading"
                inputmode="text"
                maxlength="32"
                placeholder="32 hex characters"
                spellcheck="false"
                type="text"
              />
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button :disabled="loading" type="submit" variant="default">
              {{ loading ? "Signing in…" : "Sign in" }}
            </Button>
            <Button
              :disabled="loading"
              type="button"
              variant="secondary"
              @click="onDemo"
            >
              Try demo
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter class="flex flex-col items-start gap-2">
        <Button as-child class="p-0" size="sm" variant="link">
          <RouterLink to="/register">Create an account</RouterLink>
        </Button>
        <Button as-child class="p-0" size="sm" variant="link">
          <RouterLink to="/">← Home</RouterLink>
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
