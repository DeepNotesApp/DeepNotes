<script setup lang="ts">
import { Loader2 } from "lucide-vue-next";
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 text-center">
    <Loader2 class="text-primary h-8 w-8 animate-spin" />
    <p class="text-muted-foreground text-sm">Loading page…</p>
  </div>
</template>
