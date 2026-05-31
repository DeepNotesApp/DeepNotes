<script setup lang="ts">
import { ref } from "vue";

import { Button } from "@/components/ui/button";
import type { DeepnotesApiClient } from "@/api/client";

const props = defineProps<{
  pageId: string;
  client: DeepnotesApiClient;
}>();

const restoring = ref(false);
const purging = ref(false);
const message = ref<string | null>(null);

async function restorePage() {
  restoring.value = true;
  message.value = null;
  try {
    const { error } = await props.client.POST("/api/pages/{pageId}/restore", {
      params: { path: { pageId: props.pageId } },
    });
    if (error) {
      message.value =
        typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to restore page.";
    } else {
      message.value = "Page restored. Reloading…";
      location.reload();
    }
  } catch (e) {
    message.value = e instanceof Error ? e.message : "Failed to restore page.";
  } finally {
    restoring.value = false;
  }
}

async function purgePage() {
  if (!confirm("Are you sure you want to delete this page permanently?")) return;
  purging.value = true;
  message.value = null;
  try {
    const { error } = await props.client.POST("/api/pages/{pageId}/purge", {
      params: { path: { pageId: props.pageId } },
    });
    if (error) {
      message.value =
        typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to purge page.";
    } else {
      message.value = "Page deleted permanently.";
    }
  } catch (e) {
    message.value = e instanceof Error ? e.message : "Failed to purge page.";
  } finally {
    purging.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 text-center">
    <div class="text-foreground text-lg font-semibold">Page deleted</div>
    <p class="text-muted-foreground max-w-md text-sm">
      This page has been deleted.
    </p>

    <div class="flex flex-wrap justify-center gap-2">
      <Button
        variant="secondary"
        :disabled="restoring || purging"
        @click="restorePage"
      >
        {{ restoring ? "Restoring…" : "Restore page" }}
      </Button>
      <Button
        variant="destructive"
        :disabled="restoring || purging"
        @click="purgePage"
      >
        {{ purging ? "Purging…" : "Delete permanently" }}
      </Button>
    </div>

    <p v-if="message" class="text-muted-foreground text-xs">
      {{ message }}
    </p>
  </div>
</template>
