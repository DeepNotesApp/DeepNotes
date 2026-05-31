<script setup lang="ts">
import { ref } from "vue";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const props = defineProps<{
  groupId: string;
  onUnlock: (password: string) => Promise<boolean>;
}>();

const password = ref("");
const unlocking = ref(false);
const error = ref<string | null>(null);

async function onSubmit() {
  if (!password.value) return;
  unlocking.value = true;
  error.value = null;
  try {
    const ok = await props.onUnlock(password.value);
    if (!ok) {
      error.value = "Incorrect password.";
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Could not unlock.";
  } finally {
    unlocking.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 text-center">
    <div class="text-foreground text-lg font-semibold">Password protected</div>
    <p class="text-muted-foreground max-w-md text-sm">
      This group is password protected.
    </p>

    <form
      class="flex w-full max-w-xs flex-col gap-2"
      @submit.prevent="onSubmit"
    >
      <Input
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
      />
      <Button type="submit" :disabled="unlocking || !password">
        {{ unlocking ? "Unlocking…" : "Enter" }}
      </Button>
    </form>

    <p v-if="error" class="text-destructive text-xs">
      {{ error }}
    </p>
  </div>
</template>
