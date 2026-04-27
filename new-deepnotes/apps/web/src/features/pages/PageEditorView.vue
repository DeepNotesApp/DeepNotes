<script setup lang="ts">
import {
  base64ToBytes,
  type SymmetricKeyring,
} from "@deepnotes/e2ee";
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

import { uint8ToBase64 } from "../auth/bytes";
import { readSessionCrypto } from "../auth/crypto-storage";
import { useSession } from "../auth/useSession";
import {
  decryptPageDocUpdate,
  encryptPageDocUpdate,
  unlockPageCollabSymmetricKeyring,
} from "./page-collab-crypto";

const route = useRoute();
const router = useRouter();
const { client, isAuthenticated, user, bootstrapped } = useSession();

const pageId = computed(() => String(route.params.pageId ?? ""));

const ydoc = new Y.Doc();
const ytext = ydoc.getText("default");

const yStateBytes = ref(0);
const localBody = ref("");

const loadError = ref<string | null>(null);
const collabLoading = ref(true);
const cryptoError = ref<string | null>(null);
const pushError = ref<string | null>(null);
const collabLastIndex = ref<number | null>(null);
const updateCount = ref(0);

const hydrating = ref(false);
let serverStateVector: Uint8Array = Y.encodeStateVector(ydoc);
let pageKeyring: SymmetricKeyring | null = null;

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function refreshYMetrics() {
  yStateBytes.value = Y.encodeStateAsUpdateV2(ydoc).byteLength;
}

watch(localBody, (v) => {
  if (hydrating.value) {
    return;
  }
  ydoc.transact(() => {
    ytext.delete(0, ytext.length);
    ytext.insert(0, v);
  }, "ui");
  refreshYMetrics();
  schedulePush();
});

function schedulePush() {
  if (pageKeyring == null) {
    return;
  }
  if (user.value?.demo === true) {
    return;
  }
  if (pushTimer != null) {
    clearTimeout(pushTimer);
  }
  pushTimer = setTimeout(() => {
    void flushPush();
  }, 700);
}

async function flushPush() {
  pushTimer = null;
  if (pageKeyring == null || !isAuthenticated.value) {
    return;
  }
  const id = pageId.value;
  if (!id) {
    return;
  }
  const diff = Y.encodeStateAsUpdateV2(ydoc, serverStateVector);
  if (diff.byteLength === 0) {
    return;
  }
  pushError.value = null;
  try {
    const enc = encryptPageDocUpdate({
      pageKeyring,
      pageId: id,
      plaintext: diff,
    });
    const expected = collabLastIndex.value;
    const nextIndex =
      expected == null ? 0 : expected + 1;
    const { error, response } = await client.POST(
      "/api/pages/{pageId}/collab-updates",
      {
        params: { path: { pageId: id } },
        body: {
          expectedLastIndex: expected,
          updates: [
            {
              index: nextIndex,
              encryptedData: uint8ToBase64(enc),
            },
          ],
        },
      },
    );
    if (response.status === 204) {
      serverStateVector = Y.encodeStateVector(ydoc);
      collabLastIndex.value = nextIndex;
      return;
    }
    if (error && typeof error === "object" && "message" in error) {
      pushError.value = String((error as { message: string }).message);
    } else {
      pushError.value = "Could not save page update.";
    }
  } catch (e) {
    pushError.value =
      e instanceof Error ? e.message : "Could not save page update.";
  }
}

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
    if (!bootstrapped.value) {
      return;
    }
    if (!isAuthenticated.value) {
      return;
    }
    const id = pageId.value;
    if (!id) {
      return;
    }
    loadError.value = null;
    cryptoError.value = null;
    collabLoading.value = true;
    pageKeyring = null;
    try {
      const { data, error, response } = await client.GET(
        "/api/pages/{pageId}/collab-updates",
        { params: { path: { pageId: id } } },
      );
      if (response.status !== 200 || !data) {
        if (error && typeof error === "object" && "message" in error) {
          loadError.value = String((error as { message: string }).message);
        } else {
          loadError.value = "Could not load collab state.";
        }
        return;
      }

      collabLastIndex.value = data.lastIndex;
      updateCount.value = data.updates.length;

      if (user.value?.demo === true) {
        cryptoError.value =
          "Demo sessions do not persist client crypto; sign in with a password account to decrypt page content.";
        hydrating.value = true;
        try {
          ytext.delete(0, ytext.length);
          localBody.value = "";
        } finally {
          hydrating.value = false;
        }
        serverStateVector = Y.encodeStateVector(ydoc);
        refreshYMetrics();
        return;
      }

      const stored = readSessionCrypto();
      if (stored == null) {
        cryptoError.value =
          "Missing session crypto (sign out and sign in again with your password on this device).";
        hydrating.value = true;
        try {
          ytext.delete(0, ytext.length);
          localBody.value = "";
        } finally {
          hydrating.value = false;
        }
        serverStateVector = Y.encodeStateVector(ydoc);
        refreshYMetrics();
        return;
      }

      try {
        pageKeyring = await unlockPageCollabSymmetricKeyring({
          pageId: id,
          groupId: data.groupId,
          pageEncryptedSymmetricKeyring: base64ToBytes(
            data.pageEncryptedSymmetricKeyring,
          ),
          groupEncryptedContentKeyring: base64ToBytes(
            data.groupEncryptedContentKeyring,
          ),
          memberEncryptedAccessKeyring:
            data.memberEncryptedAccessKeyring != null
              ? base64ToBytes(data.memberEncryptedAccessKeyring)
              : null,
          groupAccessKeyring:
            data.groupAccessKeyring != null
              ? base64ToBytes(data.groupAccessKeyring)
              : null,
          stored,
        });
      } catch (e) {
        cryptoError.value =
          e instanceof Error
            ? e.message
            : "Could not unlock page encryption keys.";
        hydrating.value = true;
        try {
          ytext.delete(0, ytext.length);
          localBody.value = "";
        } finally {
          hydrating.value = false;
        }
        serverStateVector = Y.encodeStateVector(ydoc);
        refreshYMetrics();
        return;
      }

      hydrating.value = true;
      try {
        ytext.delete(0, ytext.length);
        for (const u of data.updates) {
          const plain = decryptPageDocUpdate({
            pageKeyring,
            pageId: id,
            ciphertext: base64ToBytes(u.encryptedData),
          });
          Y.applyUpdateV2(ydoc, plain);
        }
        localBody.value = ytext.toString();
        serverStateVector = Y.encodeStateVector(ydoc);
        refreshYMetrics();
      } finally {
        hydrating.value = false;
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
        <CardTitle>Server collab</CardTitle>
        <CardDescription>
          <code
            class="bg-muted rounded px-1 py-0.5 font-mono text-xs"
            >GET /api/pages/…/collab-updates</code
          >
          loads ciphertext + page/group key material; the client decrypts with
          keys from your password session.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2 text-sm">
        <p v-if="collabLoading" class="text-muted-foreground">Loading…</p>
        <template v-else>
          <p v-if="loadError" class="text-destructive">
            {{ loadError }}
          </p>
          <p v-else-if="cryptoError" class="text-amber-700 dark:text-amber-400">
            {{ cryptoError }}
          </p>
          <template v-else>
            <p>
              <span class="text-muted-foreground">Updates on server</span>:
              {{ updateCount }} ·
              <span class="text-muted-foreground">lastIndex</span>:
              {{ collabLastIndex === null ? "—" : collabLastIndex }}
            </p>
            <p v-if="pushError" class="text-destructive">
              Save error: {{ pushError }}
            </p>
          </template>
        </template>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Yjs editor</CardTitle>
        <CardDescription>
          {{ yStateBytes }} byte(s) in
          <code class="font-mono text-xs">encodeStateAsUpdateV2</code> — edits
          debounce-save over
          <code class="font-mono text-xs">POST …/collab-updates</code>
          (Yjs update v2, legacy
          <code class="font-mono text-xs">PageDocUpdate</code>
          AAD).
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <Label class="text-muted-foreground" for="yjs-draft">Content</Label>
        <textarea
          id="yjs-draft"
          v-model="localBody"
          :disabled="collabLoading || !!loadError || !!cryptoError"
          class="border-input bg-background min-h-40 w-full rounded-md border px-3 py-2 font-mono text-sm disabled:opacity-50"
        />
      </CardContent>
    </Card>
  </div>
</template>
