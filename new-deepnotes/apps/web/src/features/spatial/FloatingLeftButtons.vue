<script setup lang="ts">
import { Button } from "@/components/ui/button";
import { Camera, Search } from "@lucide/vue";

const emit = defineEmits<{
  screenshot: [];
  "find-replace": [];
}>();
</script>

<template>
  <div class="pointer-events-auto flex flex-col items-start gap-1.5">
    <Button
      variant="ghost"
      size="icon"
      class="bg-card border-border h-8 w-8 rounded-md border shadow-sm"
      title="Screenshot"
      @click="emit('screenshot')"
    >
      <Camera class="h-3.5 w-3.5" />
    </Button>

    <Button
      variant="ghost"
      size="icon"
      class="bg-card border-border h-8 w-8 rounded-md border shadow-sm"
      title="Find and replace"
      @click="emit('find-replace')"
    >
      <Search class="h-3.5 w-3.5" />
    </Button>
  </div>
</template>
