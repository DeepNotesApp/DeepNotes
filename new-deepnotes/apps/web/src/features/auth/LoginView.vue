<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  ArrowLeft,
  Fingerprint,
  KeyRound,
  Mail,
} from "lucide-vue-next";

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
const marketingUrl = import.meta.env.VITE_MARKETING_APP_URL?.trim().replace(/\/$/, "") || "https://deepnotes.app";

const {
  loading,
  lastError,
  twoFactorRequired,
  isAuthenticated,
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
  <div class="w-full max-w-sm">
    <Card>
        <CardHeader class="pb-4">
          <CardTitle class="text-lg">Sign in</CardTitle>
          <CardDescription>
            Use your email and password to sign in.
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-4">
          <Alert
            v-if="registeredOk"
            class="border-emerald-500/20 bg-emerald-500/10 text-emerald-700"
            role="status"
          >
            <AlertDescription>
              Account created successfully. Sign in with the same email and
              password.
            </AlertDescription>
          </Alert>

          <Alert
            v-if="lastError"
            class="border-destructive/20 bg-destructive/10 text-destructive"
            role="alert"
          >
            <AlertDescription>{{ lastError }}</AlertDescription>
          </Alert>

          <form class="space-y-4" @submit.prevent="onSubmit">
            <div class="space-y-2">
              <Label for="login-email">Email</Label>
              <div class="relative">
                <Mail
                  class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="login-email"
                  v-model="email"
                  autocomplete="username"
                  class="pl-9"
                  :disabled="loading"
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="login-password">Password</Label>
              <div class="relative">
                <KeyRound
                  class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="login-password"
                  v-model="password"
                  autocomplete="current-password"
                  class="pl-9"
                  :disabled="loading"
                  name="password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
            </div>

            <div class="flex items-center gap-2">
              <Checkbox
                id="remember"
                v-model:checked="rememberSession"
                :disabled="loading"
              />
              <Label
                class="text-muted-foreground text-sm font-normal"
                for="remember"
              >
                Remember this device
              </Label>
            </div>

            <div
              v-if="twoFactorRequired"
              class="border-border space-y-3 border-t pt-4"
            >
              <p class="text-muted-foreground flex items-center gap-2 text-sm">
                <Fingerprint class="size-4" />
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

            <Button :disabled="loading" class="w-full" type="submit">
              <LogIn class="mr-2 size-4" />
              {{ loading ? "Signing in…" : "Sign in" }}
            </Button>
          </form>
        </CardContent>

        <CardFooter
          class="text-muted-foreground flex flex-col items-center gap-3 text-sm"
        >
          <div>
            Don't have an account?
            <RouterLink
              class="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
              to="/register"
            >
              Create one
            </RouterLink>
          </div>
          <a
            :href="marketingUrl"
            class="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
          >
            <ArrowLeft class="size-3.5" />
            Back to home
          </a>
        </CardFooter>
      </Card>
    </div>
</template>
