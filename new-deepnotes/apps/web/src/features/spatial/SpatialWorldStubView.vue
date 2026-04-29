<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useSession } from "../auth/useSession";
import { useUserPageLists } from "../pages/useUserPageLists";
import SpatialWorldCanvas from "./SpatialWorldCanvas.vue";
import { spiralPagePinLayout } from "./spatial-layout";

const route = useRoute();
const router = useRouter();
const { isAuthenticated, user } = useSession();
const {
  startingPageId,
  recentPageIds,
  favoritePageIds,
  load: loadLists,
} = useUserPageLists();

const canvasRef = ref<{ resetView: () => void } | null>(null);

const pagePins = computed(() => {
  const ids: string[] = [];
  const pushUnique = (id: string | null) => {
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  };
  pushUnique(startingPageId.value);
  for (const id of favoritePageIds.value) {
    pushUnique(id);
  }
  for (const id of recentPageIds.value) {
    pushUnique(id);
  }
  const layout = spiralPagePinLayout(ids.length);
  return ids.map((id, i) => ({
    id,
    x: layout[i]!.x,
    y: layout[i]!.y,
  }));
});

function pinLabel(id: string): string {
  if (id.length <= 12) {
    return id;
  }
  return `${id.slice(0, 4)}…${id.slice(-6)}`;
}

onMounted(() => {
  if (!isAuthenticated.value) {
    void router.replace({
      name: "login",
      query: { redirect: route.fullPath },
    });
    return;
  }
  void loadLists();
});
</script>

<template>
  <div v-if="!isAuthenticated" class="text-muted-foreground text-sm" />
  <div
    v-else
    class="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6"
    data-testid="spatial-world-stub"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-lg font-semibold">Page canvas</h1>
        <p class="text-muted-foreground text-xs">
          Every DeepNotes page is a spatial world. This map is a quick overview;
          open a page to edit—with multi-note canvas parity tracked toward legacy.
        </p>
      </div>
      <Button as-child size="sm" variant="outline">
        <RouterLink to="/">Home</RouterLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Pan and zoom</CardTitle>
        <CardDescription>
          Ctrl/Cmd + wheel to zoom toward the cursor. Wheel pans. Middle-drag or
          hold Space and drag to pan (Space is ignored while typing in inputs or
          the editor).
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <SpatialWorldCanvas ref="canvasRef">
          <RouterLink
            v-for="pin in pagePins"
            :key="pin.id"
            :to="`/pages/${pin.id}`"
            class="border-border bg-card text-card-foreground pointer-events-auto absolute top-0 left-0 z-10 max-w-44 rounded-md border px-2 py-1.5 text-xs shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring outline-none focus-visible:ring-2"
            :style="{
              transform: `translate(${pin.x}px, ${pin.y}px) translate(-50%, -50%)`,
            }"
          >
            <span class="font-medium">Open page</span>
            <span
              class="text-muted-foreground mt-0.5 block truncate font-mono text-[10px]"
              :title="pin.id"
            >
              {{ pinLabel(pin.id) }}
            </span>
          </RouterLink>
        </SpatialWorldCanvas>
        <div class="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" @click="canvasRef?.resetView()">
            Reset view
          </Button>
          <span
            v-if="pagePins.length === 0"
            class="text-muted-foreground text-xs"
          >
            No starting, favorite, or recent pages yet — use
            <RouterLink class="underline" to="/pages">Pages</RouterLink>
            to open one.
          </span>
        </div>
        <p v-if="user" class="text-muted-foreground font-mono text-xs break-all">
          Personal group {{ user.personalGroupId }}
        </p>
        <div class="flex flex-wrap gap-2">
          <Button as-child size="sm" variant="secondary">
            <RouterLink to="/pages">All pages</RouterLink>
          </Button>
          <Button
            v-if="startingPageId"
            as-child
            size="sm"
            variant="default"
          >
            <RouterLink :to="`/pages/${startingPageId}`">
              Open starting page
            </RouterLink>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
