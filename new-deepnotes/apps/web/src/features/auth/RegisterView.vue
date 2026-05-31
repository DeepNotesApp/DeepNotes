<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import {
  ArrowLeft,
  Lock,
  Mail,
  Sparkles,
  User,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSession } from "./useSession";
import { buildUserRegisterRequest } from "./build-user-register";

const router = useRouter();
const { client, isAuthenticated, loginWithDemo } = useSession();

const email = ref("");
const displayName = ref("");
const password = ref("");
const password2 = ref("");
const submitting = ref(false);
const formError = ref<string | null>(null);

onMounted(() => {
  if (isAuthenticated.value) {
    void router.replace({ name: "home" });
  }
});

async function onDemo() {
  formError.value = null;
  const { ok } = await loginWithDemo();
  if (ok) await router.push({ name: "home" });
}

async function onSubmit() {
  formError.value = null;
  if (password.value !== password2.value) {
    formError.value = "Passwords do not match.";
    return;
  }
  submitting.value = true;
  try {
    const body = await buildUserRegisterRequest({
      email: email.value,
      password: password.value,
      displayName: displayName.value,
    });
    const { data, error, response } = await client.POST("/api/users", { body });
    if (response.status === 201 && data) {
      await router.push({ name: "login", query: { registered: "1" } });
      return;
    }
    if (error && typeof error === "object" && "message" in error) {
      formError.value = String((error as { message: string }).message);
    } else {
      formError.value = "Registration failed.";
    }
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <div class="w-full max-w-sm">
    <Card>
        <CardHeader class="pb-4">
          <CardTitle class="text-lg">Register</CardTitle>
          <CardDescription>
            Fill in the details below to get started.
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-4">
          <Alert
            v-if="formError"
            class="border-destructive/20 bg-destructive/10 text-destructive"
            role="alert"
          >
            <AlertDescription>{{ formError }}</AlertDescription>
          </Alert>

          <Button
            class="w-full"
            :disabled="submitting"
            type="button"
            variant="outline"
            @click="onDemo"
          >
            <Sparkles class="mr-2 size-4" />
            Try the demo
          </Button>

          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <span class="w-full border-t"></span>
            </div>
            <div class="relative flex justify-center text-xs uppercase">
              <span class="bg-card text-muted-foreground px-2">
                or sign up with email
              </span>
            </div>
          </div>

          <form class="space-y-4" @submit.prevent="onSubmit">
            <div class="space-y-2">
              <Label for="reg-email">Email</Label>
              <div class="relative">
                <Mail
                  class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="reg-email"
                  v-model="email"
                  autocomplete="email"
                  class="pl-9"
                  :disabled="submitting"
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="reg-name">Display name</Label>
              <div class="relative">
                <User
                  class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="reg-name"
                  v-model="displayName"
                  autocomplete="name"
                  class="pl-9"
                  :disabled="submitting"
                  maxlength="64"
                  name="display-name"
                  placeholder="Your name"
                  required
                  type="text"
                />
              </div>
              <p class="text-muted-foreground text-xs">
                This is encrypted and unreadable to the server.
              </p>
            </div>

            <div class="space-y-2">
              <Label for="reg-pass">Password</Label>
              <div class="relative">
                <Lock
                  class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="reg-pass"
                  v-model="password"
                  autocomplete="new-password"
                  class="pl-9"
                  :disabled="submitting"
                  name="new-password"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
            </div>

            <div class="space-y-2">
              <Label for="reg-pass2">Confirm password</Label>
              <div class="relative">
                <Lock
                  class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2"
                />
                <Input
                  id="reg-pass2"
                  v-model="password2"
                  autocomplete="new-password"
                  class="pl-9"
                  :disabled="submitting"
                  name="new-password-confirm"
                  placeholder="••••••••"
                  required
                  type="password"
                />
              </div>
            </div>

            <Button :disabled="submitting" class="w-full" type="submit">
              <UserPlus class="mr-2 size-4" />
              {{ submitting ? "Creating…" : "Create account" }}
            </Button>
          </form>
        </CardContent>

        <CardFooter
          class="text-muted-foreground flex flex-col items-center gap-3 text-sm"
        >
          <div>
            Already have an account?
            <RouterLink
              class="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
              to="/login"
            >
              Sign in
            </RouterLink>
          </div>
          <RouterLink
            class="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"
            to="/"
          >
            <ArrowLeft class="size-3.5" />
            Back to home
          </RouterLink>
        </CardFooter>
      </Card>
    </div>
</template>
