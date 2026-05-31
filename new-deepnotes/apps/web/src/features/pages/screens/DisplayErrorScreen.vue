<script setup lang="ts">
defineProps<{
  message?: string;
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 text-center">
    <div class="text-destructive text-lg font-semibold">Error</div>
    <p class="text-muted-foreground max-w-md text-sm">
      {{ message || "An unexpected error occurred while loading this page." }}
    </p>
  </div>
</template>
