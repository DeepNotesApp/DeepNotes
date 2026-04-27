<script setup lang="ts">
import { onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";

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
const { client, isAuthenticated } = useSession();

const email = ref("");
const password = ref("");
const password2 = ref("");
const submitting = ref(false);
const formError = ref<string | null>(null);

onMounted(() => {
  if (isAuthenticated.value) {
    void router.replace({ name: "home" });
  }
});

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
  <div class="mx-auto w-full max-w-md">
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>
          Registration uses the same random ciphertext fields as a demo user for now;
          sign in after with this email and password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert v-if="formError" class="mb-4" role="alert" variant="destructive">
          <AlertDescription>{{ formError }}</AlertDescription>
        </Alert>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-2">
            <Label for="reg-email">Email</Label>
            <Input
              id="reg-email"
              v-model="email"
              autocomplete="email"
              :disabled="submitting"
              name="email"
              required
              type="email"
            />
          </div>
          <div class="space-y-2">
            <Label for="reg-pass">Password</Label>
            <Input
              id="reg-pass"
              v-model="password"
              autocomplete="new-password"
              :disabled="submitting"
              name="new-password"
              required
              type="password"
            />
          </div>
          <div class="space-y-2">
            <Label for="reg-pass2">Confirm password</Label>
            <Input
              id="reg-pass2"
              v-model="password2"
              autocomplete="new-password"
              :disabled="submitting"
              name="new-password-confirm"
              required
              type="password"
            />
          </div>
          <Button :disabled="submitting" type="submit" variant="default">
            {{ submitting ? "Creating…" : "Register" }}
          </Button>
        </form>
      </CardContent>
      <CardFooter class="flex flex-col items-start gap-2">
        <Button as-child class="p-0" size="sm" variant="link">
          <RouterLink to="/login">Already have an account? Sign in</RouterLink>
        </Button>
        <Button as-child class="p-0" size="sm" variant="link">
          <RouterLink to="/">← Home</RouterLink>
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>
