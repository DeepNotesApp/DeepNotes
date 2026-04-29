<script setup lang="ts">
import { onMounted } from "vue";
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

const route = useRoute();
const router = useRouter();
const { isAuthenticated, user } = useSession();
const { startingPageId, load: loadLists } = useUserPageLists();

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
        <h1 class="text-lg font-semibold">Spatial workspace</h1>
        <p class="text-muted-foreground text-xs">
          Preview shell — full infinite canvas parity is not shipped in this
          build.
        </p>
      </div>
      <Button as-child size="sm" variant="outline">
        <RouterLink to="/">Home</RouterLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Canvas stub</CardTitle>
        <CardDescription>
          Legacy DeepNotes renders notes on a pannable, zoomable world inside a
          page. The new app’s rich editor is document-first; this route reserves
          UX and navigation for a future spatial layer without blocking
          shipping the rest of parity.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div
          class="border-border bg-muted/20 bg-size-[24px_24px] flex min-h-[220px] items-center justify-center rounded-md border border-dashed bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)]"
          aria-hidden="true"
        >
          <p class="text-muted-foreground max-w-sm text-center text-sm">
            Placeholder grid — no interactive canvas yet.
          </p>
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
