<script setup lang="ts">
import { ref } from "vue";
import { Route, History, Star, ListChecks } from "lucide-vue-next";
import type { Button } from "@/components/ui/button";

export type LeftTab = "path" | "recent" | "favorites" | "selected";

const activeTab = ref<LeftTab>("path");

const tabs = [
  { key: "path" as LeftTab, label: "Path", icon: Route },
  { key: "recent" as LeftTab, label: "Recent", icon: History },
  { key: "favorites" as LeftTab, label: "Favorites", icon: Star },
  { key: "selected" as LeftTab, label: "Selected", icon: ListChecks },
];
</script>

<template>
  <div class="flex flex-col h-full w-full overflow-hidden">
    <!-- Horizontal tab strip -->
    <div
      class="border-border/40 bg-muted/30 flex flex-row items-center gap-1 border-b px-2 py-1"
    >
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :title="tab.label"
        class="hover:bg-muted flex h-8 w-8 items-center justify-center rounded-md transition-colors"
        :class="{
          'bg-primary/10 text-primary': activeTab === tab.key,
          'text-muted-foreground': activeTab !== tab.key,
        }"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" class="h-4 w-4" />
      </button>
    </div>

    <!-- Content pane -->
    <div class="flex-1 overflow-y-auto p-2">
      <slot :active-tab="activeTab" />
    </div>
  </div>
</template>
