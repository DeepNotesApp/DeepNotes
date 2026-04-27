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
import { buildJoinInvitationAcceptBody } from "./group-membership-crypto";

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

async function accept() {
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
    error.value = "Enter the display name to use in this group.";
    return;
  }
  actionLoading.value = true;
  error.value = null;
  try {
    const gpk = await client.GET("/api/groups/{groupId}/public-keyring", {
      params: { path: { groupId: id } },
    });
    if (gpk.response.status !== 200 || gpk.data == null) {
      error.value =
        gpk.error && typeof gpk.error === "object" && "message" in gpk.error
          ? String((gpk.error as { message?: string }).message)
          : "Could not load group key (no pending invite or access).";
      return;
    }
    const body = await buildJoinInvitationAcceptBody({
      stored,
      groupPublicKeyringB64: gpk.data.groupPublicKeyring,
      displayName: name,
    });
    const res = await client.POST(
      "/api/groups/{groupId}/join-invitations/me/accept",
      {
        params: { path: { groupId: id } },
        body: { userEncryptedName: body.userEncryptedName },
      },
    );
    if (res.response.status !== 204) {
      error.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not accept invitation.";
      return;
    }
    void router.replace({ name: "group-detail", params: { groupId: id } });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Accept failed.";
  } finally {
    actionLoading.value = false;
  }
}

async function reject() {
  const id = groupId.value;
  if (id == null || !validGroupId.value) {
    return;
  }
  actionLoading.value = true;
  error.value = null;
  try {
    const res = await client.POST(
      "/api/groups/{groupId}/join-invitations/me/reject",
      { params: { path: { groupId: id } } },
    );
    if (res.response.status !== 204) {
      error.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not reject invitation.";
      return;
    }
    void router.replace({ name: "groups" });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Reject failed.";
  } finally {
    actionLoading.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg space-y-4 p-4">
    <h1 class="text-lg font-semibold">Group invitation</h1>
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
        Accepting an invite needs your account keys. Sign out and sign back in with your
        password on this device (demo sessions cannot decrypt).
      </AlertDescription>
    </Alert>

    <Card v-if="validGroupId">
      <CardHeader>
        <CardTitle class="text-base">Accept invitation</CardTitle>
        <CardDescription>
          Choose how your name appears to other members (E2EE). You can reject instead.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <Label for="invite-name">Display name in this group</Label>
          <Input
            id="invite-name"
            v-model="displayName"
            autocomplete="name"
            placeholder="Your name"
            :disabled="actionLoading"
          />
        </div>
        <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
        <div class="flex flex-wrap gap-2">
          <Button
            :disabled="actionLoading || !cryptoReady"
            @click="accept()"
          >
            Accept
          </Button>
          <Button
            variant="outline"
            :disabled="actionLoading"
            @click="reject()"
          >
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
