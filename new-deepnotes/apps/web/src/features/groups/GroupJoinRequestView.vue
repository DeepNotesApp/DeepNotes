<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { readSessionCrypto } from "../auth/session-keyrings";
import { useSession } from "../auth/useSession";
import { buildJoinRequestSendBodies } from "./group-membership-crypto";

const route = useRoute();
const router = useRouter();
const { isAuthenticated, bootstrapped, client } = useSession();

const groupId = computed(() => {
  const g = route.params.groupId;
  return Array.isArray(g) ? g[0] : g;
});

const validGroupId = computed(
  () =>
    groupId.value != null && /^[A-Za-z0-9_-]{21}$/.test(groupId.value ?? ""),
);

const actionLoading = ref(false);
const error = ref<string | null>(null);
const success = ref<string | null>(null);
const displayName = ref("");
const cryptoReady = computed(() => readSessionCrypto() != null);

watch(
  [bootstrapped, isAuthenticated, groupId],
  () => {
    if (!bootstrapped.value) {
      return;
    }
    if (!isAuthenticated.value) {
      void router.replace({
        name: "login",
        query: { redirect: route.fullPath },
      });
    }
  },
  { immediate: true },
);

async function submit() {
  const id = groupId.value;
  if (id == null || !validGroupId.value) {
    return;
  }
  const stored = readSessionCrypto();
  if (stored == null) {
    error.value =
      "Unlock client crypto by signing in with your password on this browser.";
    return;
  }
  const name = displayName.value.trim();
  if (name === "") {
    error.value = "Enter the display name managers will see.";
    return;
  }
  actionLoading.value = true;
  error.value = null;
  success.value = null;
  try {
    const gpk = await client.GET("/api/groups/{groupId}/public-keyring", {
      params: { path: { groupId: id } },
    });
    if (gpk.response.status !== 200 || gpk.data == null) {
      error.value =
        gpk.error && typeof gpk.error === "object" && "message" in gpk.error
          ? String((gpk.error as { message?: string }).message)
          : "Could not load group key (join requests may be disabled).";
      return;
    }
    const bodies = await buildJoinRequestSendBodies({
      stored,
      groupPublicKeyringB64: gpk.data.groupPublicKeyring,
      groupId: id,
      displayName: name,
    });
    const res = await client.POST("/api/groups/{groupId}/join-requests", {
      params: { path: { groupId: id } },
      body: {
        encryptedUserName: bodies.encryptedUserName,
        encryptedUserNameForUser: bodies.encryptedUserNameForUser,
      },
    });
    if (res.response.status !== 204) {
      error.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not send join request.";
      return;
    }
    success.value = "Request sent. A manager can approve it from the group screen.";
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Request failed.";
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4 p-4">
    <h1 class="text-lg font-semibold">Request to join group</h1>
    <p
      v-if="validGroupId"
      class="text-muted-foreground font-mono text-xs break-all"
    >
      {{ groupId }}
    </p>
    <p v-else class="text-destructive text-sm">Invalid group id.</p>

    <Alert v-if="isAuthenticated && !cryptoReady">
      <AlertTitle>Password sign-in required</AlertTitle>
      <AlertDescription>
        Join requests encrypt your name to the group key. Sign in with your password on
        this device.
      </AlertDescription>
    </Alert>

    <Card v-if="validGroupId">
      <CardHeader>
        <CardTitle class="text-base">Ask to join</CardTitle>
        <CardDescription>
          This group must allow join requests. Managers approve from the members page.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="join-name">Display name for reviewers</Label>
          <Input
            id="join-name"
            v-model="displayName"
            autocomplete="name"
            placeholder="Your name"
            :disabled="actionLoading"
          />
        </div>
        <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
        <p v-if="success" class="text-muted-foreground text-sm">{{ success }}</p>
        <Button
          :disabled="actionLoading || !cryptoReady"
          @click="submit()"
        >
          Send request
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
