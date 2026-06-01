<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { Awareness } from "y-protocols/awareness";
import { cursorColorForUserId } from "../pages/page-awareness-utils";

const props = defineProps<{
  awareness: Awareness;
}>();

interface RemoteUser {
  clientId: number;
  name: string;
  color: string;
  initials: string;
}

const remoteUsers = ref<RemoteUser[]>([]);

function refreshUsers() {
  const self = props.awareness.doc.clientID;
  const states = props.awareness.getStates();
  const users: RemoteUser[] = [];
  for (const [clientId, state] of states) {
    if (clientId === self) continue;
    const raw = state as any;
    const name =
      typeof raw?.user?.name === "string"
        ? raw.user.name
        : `User ${clientId}`;
    const color =
      typeof raw?.user?.color === "string"
        ? raw.user.color
        : cursorColorForUserId(String(clientId));
    const initials = name.slice(0, 2).toUpperCase();
    users.push({ clientId, name, color, initials });
  }
  remoteUsers.value = users;
}

onMounted(() => {
  refreshUsers();
  props.awareness.on("change", refreshUsers);
});

onBeforeUnmount(() => {
  props.awareness.off("change", refreshUsers);
});

const hasRemoteUsers = computed(() => remoteUsers.value.length > 0);
</script>

<template>
  <div
    v-if="hasRemoteUsers"
    data-testid="collab-avatars"
    class="pointer-events-auto absolute top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-md border bg-card px-2 py-1 shadow-sm"
  >
    <div
      v-for="user in remoteUsers"
      :key="user.clientId"
      data-testid="collab-avatar"
      class="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
      :title="user.name"
      :style="{ backgroundColor: user.color }"
    >
      {{ user.initials }}
    </div>
    <span class="text-muted-foreground ml-1 text-[10px]">
      {{ remoteUsers.length }}
    </span>
  </div>
</template>
