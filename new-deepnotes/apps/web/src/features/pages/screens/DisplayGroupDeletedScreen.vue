<script setup lang="ts">
import { ref } from "vue";

import { Button } from "@/components/ui/button";
import type { DeepnotesApiClient } from "@/api/client";

const props = defineProps<{
  groupId: string;
  client: DeepnotesApiClient;
}>();

const restoring = ref(false);
const purging = ref(false);
const message = ref<string | null>(null);

async function restoreGroup() {
  restoring.value = true;
  message.value = null;
  try {
    const { error } = await props.client.POST("/api/groups/{groupId}/restore", {
      params: { path: { groupId: props.groupId } },
    });
    if (error) {
      message.value =
        typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to restore group.";
    } else {
      message.value = "Group restored. Reloading…";
      location.reload();
    }
  } catch (e) {
    message.value = e instanceof Error ? e.message : "Failed to restore group.";
  } finally {
    restoring.value = false;
  }
}

async function purgeGroup() {
  if (!confirm("Are you sure you want to delete this group permanently?")) return;
  purging.value = true;
  message.value = null;
  try {
    const { error } = await props.client.POST("/api/groups/{groupId}/purge", {
      params: { path: { groupId: props.groupId } },
    });
    if (error) {
      message.value =
        typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to purge group.";
    } else {
      message.value = "Group deleted permanently.";
    }
  } catch (e) {
    message.value = e instanceof Error ? e.message : "Failed to purge group.";
  } finally {
    purging.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 text-center">
    <div class="text-foreground text-lg font-semibold">Group deleted</div>
    <p class="text-muted-foreground max-w-md text-sm">
      This group has been deleted.
    </p>

    <div class="flex flex-wrap justify-center gap-2">
      <Button
        variant="secondary"
        :disabled="restoring || purging"
        @click="restoreGroup"
      >
        {{ restoring ? "Restoring…" : "Restore group" }}
      </Button>
      <Button
        variant="destructive"
        :disabled="restoring || purging"
        @click="purgeGroup"
      >
        {{ purging ? "Purging…" : "Delete permanently" }}
      </Button>
    </div>

    <p v-if="message" class="text-muted-foreground text-xs">
      {{ message }}
    </p>
  </div>
</template>
