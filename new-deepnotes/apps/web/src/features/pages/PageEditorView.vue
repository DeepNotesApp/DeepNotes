<script setup lang="ts">
import * as Y from "yjs";
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import { useSession } from "../auth/useSession";

const route = useRoute();
const router = useRouter();
const { client, isAuthenticated, user, bootstrapped } = useSession();

const pageId = computed(() => String(route.params.pageId ?? ""));

/** Local Yjs doc: when page keys exist, `Y.applyUpdate(ydoc, bytes)` from decrypted collab will hydrate. */
const ydoc = new Y.Doc();
const ytext = ydoc.getText("default");
ytext.insert(
  0,
  "Local draft in Yjs. Encrypted server history is listed below; decrypt + apply in a follow-up.\n",
);

const yStateBytes = ref(Y.encodeStateAsUpdate(ydoc).byteLength);
const localBody = ref(ytext.toString());

watch(localBody, (v) => {
  ydoc.transact(() => {
    ytext.delete(0, ytext.length);
    ytext.insert(0, v);
  });
  yStateBytes.value = Y.encodeStateAsUpdate(ydoc).byteLength;
});

const loadError = ref<string | null>(null);
const collabLoading = ref(true);
const lastIndex = ref<number | null>(null);
const updateCount = ref(0);

onMounted(() => {
  if (!isAuthenticated.value) {
    void router.replace({
      name: "login",
      query: { redirect: route.fullPath },
    });
  }
});

watch(
  [bootstrapped, isAuthenticated, pageId],
  async () => {
    if (!bootstrapped.value) return;
    if (!isAuthenticated.value) return;
    const id = pageId.value;
    if (!id) return;
    loadError.value = null;
    collabLoading.value = true;
    try {
      const { data, error, response } = await client.GET(
        "/api/pages/{pageId}/collab-updates",
        { params: { path: { pageId: id } } },
      );
      if (response.status === 200 && data) {
        lastIndex.value = data.lastIndex;
        updateCount.value = data.updates.length;
        return;
      }
      if (error && typeof error === "object" && "message" in error) {
        loadError.value = String((error as { message: string }).message);
      } else {
        loadError.value = "Could not load collab state.";
      }
    } finally {
      collabLoading.value = false;
    }
  },
  { immediate: true },
);
</script>

<template>
  <div v-if="!isAuthenticated" class="text-muted-foreground text-sm" />
  <div v-else class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-lg font-semibold">Page</h1>
        <p
          v-if="user"
          class="text-muted-foreground font-mono text-xs break-all"
        >
          {{ pageId }} · personal group {{ user.personalGroupId }}
        </p>
      </div>
      <Button as-child size="sm" variant="outline">
        <RouterLink to="/">Home</RouterLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Server collab (encrypted)</CardTitle>
        <CardDescription>
          Bootstrap from
          <code
            class="bg-muted rounded px-1 py-0.5 font-mono text-xs"
            >GET /api/pages/…/collab-updates</code
          >. Decrypting each blob needs the page keyring; not wired in this
          shell yet.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <p v-if="collabLoading" class="text-muted-foreground">Loading…</p>
        <template v-else>
          <p v-if="loadError" class="text-destructive">
            {{ loadError }}
          </p>
          <template v-else>
            <p>
              <span class="text-muted-foreground">Updates on server</span
              >: {{ updateCount }} ·
              <span class="text-muted-foreground">lastIndex</span>:
              {{ lastIndex === null ? "—" : lastIndex }}
            </p>
          </template>
        </template>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Yjs (local only)</CardTitle>
        <CardDescription>
          {{ yStateBytes }} byte(s) in
          <code class="font-mono text-xs">encodeStateAsUpdate</code> — sync to
          Postgres will follow E2E helpers.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <Label class="text-muted-foreground" for="yjs-draft">Draft</Label>
        <textarea
          id="yjs-draft"
          v-model="localBody"
          class="border-input bg-background min-h-40 w-full rounded-md border px-3 py-2 font-mono text-sm"
        />
      </CardContent>
    </Card>
  </div>
</template>
