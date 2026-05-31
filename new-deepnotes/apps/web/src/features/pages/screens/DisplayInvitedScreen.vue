<script setup lang="ts">
import { ref } from "vue";
import { RouterLink } from "vue-router";

import { Button } from "@/components/ui/button";
import type { DeepnotesApiClient } from "@/api/client";

const props = defineProps<{
  groupId: string;
  client: DeepnotesApiClient;
}>();

const loading = ref(false);
const message = ref<string | null>(null);

async function reject() {
  loading.value = true;
  message.value = null;
  try {
    const { error } = await props.client.POST(
      "/api/groups/{groupId}/join-invitations/me/reject",
      { params: { path: { groupId: props.groupId } } },
    );
    if (error) {
      message.value =
        typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to reject invitation.";
    } else {
      message.value = "Invitation rejected. Reloading…";
      location.reload();
    }
  } catch (e) {
    message.value =
      e instanceof Error ? e.message : "Failed to reject invitation.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 text-center">
    <div class="text-foreground text-lg font-semibold">Invitation</div>
    <p class="text-muted-foreground max-w-md text-sm">
      You were invited to join the group <b>{{ groupId }}</b>.
    </p>

    <div class="flex flex-wrap justify-center gap-2">
      <Button as-child :disabled="loading">
        <RouterLink :to="`/groups/${groupId}`">Accept invitation</RouterLink>
      </Button>
      <Button variant="destructive" :disabled="loading" @click="reject">
        {{ loading ? "Loading…" : "Reject invitation" }}
      </Button>
    </div>

    <p v-if="message" class="text-muted-foreground text-xs">
      {{ message }}
    </p>
  </div>
</template>
