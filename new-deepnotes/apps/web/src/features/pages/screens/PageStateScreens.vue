<script setup lang="ts">
import type { DeepnotesApiClient } from "@/api/client";

import type { PageStatus } from "../usePageStatus";
import DisplayErrorScreen from "./DisplayErrorScreen.vue";
import DisplayGroupDeletedScreen from "./DisplayGroupDeletedScreen.vue";
import DisplayInvitedScreen from "./DisplayInvitedScreen.vue";
import DisplayLoadingScreen from "./DisplayLoadingScreen.vue";
import DisplayNonExistentScreen from "./DisplayNonExistentScreen.vue";
import DisplayPageDeletedScreen from "./DisplayPageDeletedScreen.vue";
import DisplayPasswordScreen from "./DisplayPasswordScreen.vue";
import DisplayRejectedScreen from "./DisplayRejectedScreen.vue";
import DisplayUnauthorizedScreen from "./DisplayUnauthorizedScreen.vue";

defineProps<{
  status: PageStatus;
  pageId: string;
  groupId: string | null;
  client: DeepnotesApiClient;
  loadError?: string | null;
  cryptoError?: string | null;
  onUnlockPassword?: (password: string) => Promise<boolean>;
}>();
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center justify-center gap-4 overflow-hidden p-8 text-center"
  >
    <DisplayLoadingScreen v-if="status === 'loading'" />
    <DisplayErrorScreen
      v-else-if="status === 'error'"
      :message="loadError ?? cryptoError ?? undefined"
    />
    <DisplayNonExistentScreen v-else-if="status === 'page-nonexistent'" />
    <DisplayPageDeletedScreen
      v-else-if="status === 'page-deleted'"
      :page-id="pageId"
      :client="client"
    />
    <DisplayGroupDeletedScreen
      v-else-if="status === 'group-deleted'"
      :group-id="groupId ?? ''"
      :client="client"
    />
    <DisplayInvitedScreen
      v-else-if="status === 'invited'"
      :group-id="groupId ?? ''"
      :client="client"
    />
    <DisplayRejectedScreen v-else-if="status === 'rejected'" />
    <DisplayUnauthorizedScreen v-else-if="status === 'unauthorized'" />
    <DisplayPasswordScreen
      v-else-if="status === 'password' && groupId && onUnlockPassword"
      :group-id="groupId"
      :on-unlock="onUnlockPassword"
    />
    <DisplayErrorScreen v-else :message="loadError ?? cryptoError ?? undefined" />
  </div>
</template>
