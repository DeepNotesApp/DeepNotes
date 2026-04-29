<script setup lang="ts">
import Collaboration from "@tiptap/extension-collaboration";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/vue-3";
import {
  base64ToBytes,
  type SymmetricKeyring,
} from "@deepnotes/e2ee";
import * as Y from "yjs";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { uint8ToBase64 } from "../auth/bytes";
import { readSessionCrypto } from "../auth/crypto-storage";
import { useSession } from "../auth/useSession";
import { useUserPageLists } from "./useUserPageLists";
import {
  decryptPageDocUpdate,
  encryptPageDocUpdate,
  unlockPageCollabSymmetricKeyring,
} from "./page-collab-crypto";
import {
  applyYjsFullStateSnapshot,
  buildPageSnapshotSaveBodies,
  decryptPageSnapshotPlainUpdate,
} from "./page-snapshot-crypto";

import type { components } from "@/api/api-types.generated";

type SnapshotRow = components["schemas"]["PageSnapshotListItem"];

const Y_TEXT_DEFAULT = "default";
const Y_FRAG_PROSEMIRROR = "prosemirror";

const route = useRoute();
const router = useRouter();
const { client, isAuthenticated, user, bootstrapped } = useSession();
const {
  favoritePageIds,
  error: pageListError,
  load: loadPageLists,
  removeFromRecent: removeRecentPages,
  addFavorites,
  removeFavorites,
} = useUserPageLists();

const pageId = computed(() => String(route.params.pageId ?? ""));

const pathPageIds = ref<string[]>([]);
const pathError = ref<string | null>(null);
const pathLoading = ref(false);
const pagePrefsLoading = ref(false);
const bumpMessage = ref<string | null>(null);
const favoriteMessage = ref<string | null>(null);

const collabGroupId = ref<string | null>(null);
const snapshots = ref<SnapshotRow[]>([]);
const snapshotLoading = ref(false);
const pageOpsMessage = ref<string | null>(null);

const ydoc = new Y.Doc();
const legacyPlainToImport = ref<string | null>(null);

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

const yStateBytes = ref(0);

function refreshYMetrics() {
  yStateBytes.value = Y.encodeStateAsUpdateV2(ydoc).byteLength;
}

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      undoRedo: false,
    }),
    Collaboration.configure({
      document: ydoc,
      field: Y_FRAG_PROSEMIRROR,
    }),
  ],
  editorProps: {
    attributes: {
      class: "max-w-none min-h-40 px-3 py-2 text-sm leading-relaxed focus:outline-none",
    },
  },
  onUpdate() {
    refreshYMetrics();
    if (!hydrating.value) {
      schedulePush();
    }
  },
  editable: false,
});

function setEditorEditable(on: boolean) {
  const ed = editor.value;
  if (ed != null && !ed.isDestroyed) {
    ed.setEditable(on);
  }
}

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
    const nextIndex = expected == null ? 0 : expected + 1;
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

onBeforeUnmount(() => {
  if (pushTimer != null) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
});

onMounted(() => {
  if (!isAuthenticated.value) {
    void router.replace({
      name: "login",
      query: { redirect: route.fullPath },
    });
  }
});

const isFavorite = computed(
  () => pageId.value !== "" && favoritePageIds.value.includes(pageId.value),
);

async function loadPathAndPrefs() {
  if (!bootstrapped.value || !isAuthenticated.value) {
    return;
  }
  const id = pageId.value;
  if (!id) {
    return;
  }
  pathLoading.value = true;
  pathError.value = null;
  pagePrefsLoading.value = true;
  try {
    const [pathRes] = await Promise.all([
      client.GET("/api/users/me/pages/path", {
        params: { query: { initialPageId: id } },
      }),
      loadPageLists(),
    ]);
    if (pathRes.response.status !== 200 || !pathRes.data) {
      pathError.value =
        pathRes.error &&
        typeof pathRes.error === "object" &&
        "message" in pathRes.error
          ? String((pathRes.error as { message?: string }).message)
          : "Could not load page path.";
      pathPageIds.value = [];
    } else {
      pathPageIds.value = pathRes.data.pathPageIds;
    }
  } finally {
    pathLoading.value = false;
    pagePrefsLoading.value = false;
  }
}

watch([bootstrapped, isAuthenticated, pageId], () => {
  void loadPathAndPrefs();
}, { immediate: true });

async function bumpAsStarting() {
  const id = pageId.value;
  if (!id || user.value?.demo === true) {
    return;
  }
  bumpMessage.value = null;
  const res = await client.POST("/api/pages/{pageId}/bump", {
    params: { path: { pageId: id } },
    body: {},
  });
  if (res.response.status !== 204) {
    bumpMessage.value =
      res.error && typeof res.error === "object" && "message" in res.error
        ? String((res.error as { message?: string }).message)
        : "Could not bump page.";
    return;
  }
  bumpMessage.value = "Updated starting page and recents.";
  await loadPathAndPrefs();
}

async function toggleFavorite() {
  const id = pageId.value;
  if (!id || user.value?.demo === true) {
    return;
  }
  favoriteMessage.value = null;
  if (isFavorite.value) {
    const ok = await removeFavorites([id]);
    if (!ok && pageListError.value) {
      favoriteMessage.value = pageListError.value;
    }
  } else {
    const ok = await addFavorites([id]);
    if (!ok && pageListError.value) {
      favoriteMessage.value = pageListError.value;
    }
  }
}

async function removeThisFromRecent() {
  const id = pageId.value;
  if (!id) {
    return;
  }
  favoriteMessage.value = null;
  const ok = await removeRecentPages([id]);
  if (!ok && pageListError.value) {
    favoriteMessage.value =
      pageListError.value ?? "Could not remove from recents.";
  }
}

async function loadSnapshots() {
  const id = pageId.value;
  if (!id || user.value?.demo === true) {
    snapshots.value = [];
    return;
  }
  snapshotLoading.value = true;
  try {
    const res = await client.GET("/api/pages/{pageId}/snapshots", {
      params: { path: { pageId: id } },
    });
    if (res.response.status === 200 && res.data) {
      snapshots.value = res.data.snapshots;
    } else {
      snapshots.value = [];
    }
  } finally {
    snapshotLoading.value = false;
  }
}

async function saveSnapshotManual() {
  pageOpsMessage.value = null;
  const id = pageId.value;
  const pk = pageKeyring;
  if (!id || pk == null || user.value?.demo === true) {
    return;
  }
  const bodies = buildPageSnapshotSaveBodies({
    pageKeyring: pk,
    pageId: id,
    ydoc,
  });
  const res = await client.POST("/api/pages/{pageId}/snapshots", {
    params: { path: { pageId: id } },
    body: {
      encryptedSymmetricKey: bodies.encryptedSymmetricKey,
      encryptedData: bodies.encryptedData,
    },
  });
  if (res.response.status !== 201) {
    pageOpsMessage.value =
      res.error && typeof res.error === "object" && "message" in res.error
        ? String((res.error as { message?: string }).message)
        : "Could not save snapshot.";
    return;
  }
  await loadSnapshots();
  pageOpsMessage.value = "Snapshot saved.";
}

async function restoreFromSnapshot(snapshotId: string) {
  pageOpsMessage.value = null;
  const id = pageId.value;
  const pk = pageKeyring;
  if (!id || pk == null || user.value?.demo === true) {
    return;
  }
  if (
    !confirm(
      "Restore this snapshot? The current editor state is snapshotted as pre-restore (Pro), then content is replaced locally and queued to sync.",
    )
  ) {
    return;
  }
  const preBodies = buildPageSnapshotSaveBodies({
    pageKeyring: pk,
    pageId: id,
    ydoc,
  });
  const loadRes = await client.GET("/api/pages/{pageId}/snapshots/{snapshotId}", {
    params: { path: { pageId: id, snapshotId } },
  });
  if (loadRes.response.status !== 200 || loadRes.data == null) {
    pageOpsMessage.value =
      loadRes.error && typeof loadRes.error === "object" && "message" in loadRes.error
        ? String((loadRes.error as { message?: string }).message)
        : "Could not load snapshot.";
    return;
  }
  let plain: Uint8Array;
  try {
    plain = decryptPageSnapshotPlainUpdate({
      pageKeyring: pk,
      pageId: id,
      encryptedSymmetricKeyB64: loadRes.data.encryptedSymmetricKey ?? undefined,
      encryptedDataB64: loadRes.data.encryptedData,
    });
  } catch (e) {
    pageOpsMessage.value =
      e instanceof Error ? e.message : "Could not decrypt snapshot.";
    return;
  }
  hydrating.value = true;
  try {
    applyYjsFullStateSnapshot({
      ydoc,
      proseField: Y_FRAG_PROSEMIRROR,
      legacyTextName: Y_TEXT_DEFAULT,
      update: plain,
    });
  } finally {
    hydrating.value = false;
  }
  refreshYMetrics();
  const savePre = await client.POST("/api/pages/{pageId}/snapshots", {
    params: { path: { pageId: id } },
    body: {
      encryptedSymmetricKey: preBodies.encryptedSymmetricKey,
      encryptedData: preBodies.encryptedData,
      preRestore: true,
    },
  });
  if (savePre.response.status !== 201) {
    pageOpsMessage.value =
      savePre.error && typeof savePre.error === "object" && "message" in savePre.error
        ? String((savePre.error as { message?: string }).message)
        : "Restored locally but could not save pre-restore snapshot.";
    schedulePush();
    return;
  }
  await loadSnapshots();
  pageOpsMessage.value = "Snapshot restored; pre-restore copy saved.";
  schedulePush();
}

async function deleteSnapshot(snapshotId: string) {
  pageOpsMessage.value = null;
  const id = pageId.value;
  if (!id || user.value?.demo === true) {
    return;
  }
  if (!confirm("Delete this snapshot permanently?")) {
    return;
  }
  const res = await client.DELETE("/api/pages/{pageId}/snapshots/{snapshotId}", {
    params: { path: { pageId: id, snapshotId } },
  });
  if (res.response.status !== 204) {
    pageOpsMessage.value =
      res.error && typeof res.error === "object" && "message" in res.error
        ? String((res.error as { message?: string }).message)
        : "Could not delete snapshot.";
    return;
  }
  await loadSnapshots();
}

async function setAsGroupMainPage() {
  pageOpsMessage.value = null;
  const id = pageId.value;
  const gid = collabGroupId.value;
  if (!id || gid == null || user.value?.demo === true) {
    return;
  }
  if (
    !confirm(
      "Set this page as the group’s main page? Requires Pro and manager permission on this group (legacy `pages.move`).",
    )
  ) {
    return;
  }
  const res = await client.POST("/api/pages/{pageId}/move", {
    params: { path: { pageId: id } },
    body: {
      destGroupId: gid,
      setAsMainPage: true,
    },
  });
  if (res.response.status !== 204) {
    pageOpsMessage.value =
      res.error && typeof res.error === "object" && "message" in res.error
        ? String((res.error as { message?: string }).message)
        : "Could not update main page.";
    return;
  }
  pageOpsMessage.value = "Main page updated.";
  await loadPathAndPrefs();
}

async function softDeleteThisPage() {
  pageOpsMessage.value = null;
  const id = pageId.value;
  if (!id || user.value?.demo === true) {
    return;
  }
  if (
    !confirm(
      "Soft-delete this page? It leaves a grace period before purge (cannot delete a group’s main page).",
    )
  ) {
    return;
  }
  const res = await client.DELETE("/api/pages/{pageId}", {
    params: { path: { pageId: id } },
  });
  if (res.response.status !== 204) {
    pageOpsMessage.value =
      res.error && typeof res.error === "object" && "message" in res.error
        ? String((res.error as { message?: string }).message)
        : "Could not delete page.";
    return;
  }
  void router.replace({ path: "/" });
}

watch(
  [editor, legacyPlainToImport],
  () => {
    const ed = editor.value;
    const t = legacyPlainToImport.value;
    if (ed == null || ed.isDestroyed || t == null) {
      return;
    }
    ed.commands.setContent({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: t.length > 0 ? [{ type: "text", text: t }] : [],
        },
      ],
    });
    legacyPlainToImport.value = null;
    serverStateVector = Y.encodeStateVector(ydoc);
    refreshYMetrics();
  },
  { flush: "post" },
);

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
    collabGroupId.value = null;
    snapshots.value = [];
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

      collabGroupId.value = data.groupId;
      collabLastIndex.value = data.lastIndex;
      updateCount.value = data.updates.length;

      if (user.value?.demo === true) {
        cryptoError.value =
          "Demo sessions do not persist client crypto; sign in with a password account to decrypt page content.";
        hydrating.value = true;
        try {
          const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
          ydoc.transact(() => {
            while (frag.length > 0) {
              frag.delete(frag.length - 1, 1);
            }
          });
          const legacy = ydoc.getText(Y_TEXT_DEFAULT);
          if (legacy.length > 0) {
            legacy.delete(0, legacy.length);
          }
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
        void loadSnapshots();
        hydrating.value = true;
        try {
          const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
          ydoc.transact(() => {
            while (frag.length > 0) {
              frag.delete(frag.length - 1, 1);
            }
          });
          const legacy = ydoc.getText(Y_TEXT_DEFAULT);
          if (legacy.length > 0) {
            legacy.delete(0, legacy.length);
          }
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
        void loadSnapshots();
        hydrating.value = true;
        try {
          const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
          ydoc.transact(() => {
            while (frag.length > 0) {
              frag.delete(frag.length - 1, 1);
            }
          });
          const legacy = ydoc.getText(Y_TEXT_DEFAULT);
          if (legacy.length > 0) {
            legacy.delete(0, legacy.length);
          }
        } finally {
          hydrating.value = false;
        }
        serverStateVector = Y.encodeStateVector(ydoc);
        refreshYMetrics();
        return;
      }

      hydrating.value = true;
      try {
        const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
        ydoc.transact(() => {
          while (frag.length > 0) {
            frag.delete(frag.length - 1, 1);
          }
        });
        const legacy = ydoc.getText(Y_TEXT_DEFAULT);
        if (legacy.length > 0) {
          legacy.delete(0, legacy.length);
        }
        for (const u of data.updates) {
          const plain = decryptPageDocUpdate({
            pageKeyring,
            pageId: id,
            ciphertext: base64ToBytes(u.encryptedData),
          });
          Y.applyUpdateV2(ydoc, plain);
        }
        const legacyAfter = ydoc.getText(Y_TEXT_DEFAULT);
        if (legacyAfter.length > 0) {
          legacyPlainToImport.value = legacyAfter.toString();
          ydoc.transact(() => {
            legacyAfter.delete(0, legacyAfter.length);
          });
        }
        serverStateVector = Y.encodeStateVector(ydoc);
        refreshYMetrics();
      } finally {
        hydrating.value = false;
      }
      void loadSnapshots();
    } finally {
      collabLoading.value = false;
    }
  },
  { immediate: true },
);

watch(
  [collabLoading, loadError, cryptoError, editor],
  () => {
    const canEdit =
      !collabLoading.value &&
      loadError.value == null &&
      cryptoError.value == null &&
      user.value?.demo !== true;
    setEditorEditable(canEdit);
  },
  { immediate: true, flush: "post" },
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
          {{ pageId }} · group {{ collabGroupId ?? "—" }} · personal
          {{ user.personalGroupId }}
        </p>
      </div>
      <Button as-child size="sm" variant="outline">
        <RouterLink to="/">Home</RouterLink>
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">Path and prefs</CardTitle>
        <CardDescription>
          Breadcrumb toward your personal main page, plus starting-page bump and favorites (legacy
          <code class="font-mono text-xs">users.pages</code> / <code class="font-mono text-xs">pages.bump</code>).
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3 text-sm">
        <p v-if="pathLoading" class="text-muted-foreground">Loading path…</p>
        <p v-else-if="pathError" class="text-destructive">{{ pathError }}</p>
        <nav v-else class="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
          <template v-for="(pid, i) in pathPageIds" :key="pid">
            <span v-if="i > 0" aria-hidden="true">/</span>
            <RouterLink
              v-if="i < pathPageIds.length - 1"
              class="text-primary font-mono underline"
              :to="`/pages/${pid}`"
            >{{ pid.slice(0, 8) }}…</RouterLink>
            <span v-else class="text-foreground font-mono font-medium">{{ pid }}</span>
          </template>
        </nav>
        <div class="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            :disabled="user?.demo === true || pagePrefsLoading"
            @click="bumpAsStarting()"
          >
            Make starting page
          </Button>
          <Button
            size="sm"
            variant="outline"
            :disabled="user?.demo === true || pagePrefsLoading"
            @click="toggleFavorite()"
          >
            {{ isFavorite ? "Remove favorite" : "Add favorite" }}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            :disabled="pagePrefsLoading"
            @click="removeThisFromRecent()"
          >
            Remove from recent
          </Button>
        </div>
        <p v-if="bumpMessage" class="text-muted-foreground text-xs">{{ bumpMessage }}</p>
        <p v-if="favoriteMessage" class="text-amber-800 dark:text-amber-200 text-xs">{{ favoriteMessage }}</p>
        <p v-if="user?.demo" class="text-muted-foreground text-xs">
          Demo accounts cannot bump starting page or favorites.
        </p>
      </CardContent>
    </Card>

    <p
      v-if="pageOpsMessage"
      class="text-muted-foreground border-border rounded-md border px-3 py-2 text-sm"
    >
      {{ pageOpsMessage }}
    </p>

    <Card v-if="user?.demo !== true">
      <CardHeader>
        <CardTitle class="text-base">Snapshots (Pro)</CardTitle>
        <CardDescription>
          Encrypted Yjs checkpoints (
          <code class="font-mono text-xs">PageSnapshotData</code>
          ). Requires edit access + subscription server-side.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3 text-sm">
        <p v-if="snapshotLoading" class="text-muted-foreground">Loading snapshots…</p>
        <p v-else-if="snapshots.length === 0" class="text-muted-foreground">No snapshots yet.</p>
        <ul v-else class="space-y-2">
          <li
            v-for="s in snapshots"
            :key="s.snapshotId"
            class="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="text-xs">
              <div class="font-mono font-medium">{{ s.snapshotId }}</div>
              <div class="text-muted-foreground">
                {{ s.type }} · {{ s.creationDate }}
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                :disabled="
                  collabLoading ||
                    loadError != null ||
                    cryptoError != null
                "
                @click="restoreFromSnapshot(s.snapshotId)"
              >
                Restore
              </Button>
              <Button
                size="sm"
                variant="outline"
                @click="deleteSnapshot(s.snapshotId)"
              >
                Delete
              </Button>
            </div>
          </li>
        </ul>
        <Button
          size="sm"
          :disabled="
            collabLoading ||
              loadError != null ||
              cryptoError != null
          "
          @click="saveSnapshotManual()"
        >
          Save snapshot
        </Button>
      </CardContent>
    </Card>

    <Card v-if="user?.demo !== true">
      <CardHeader>
        <CardTitle class="text-base">Page management</CardTitle>
        <CardDescription>
          Main-page promotion uses
          <code class="font-mono text-xs">POST …/move</code>
          with the same group id (Pro). Soft-delete uses
          <code class="font-mono text-xs">DELETE …/pages/:id</code>.
        </CardDescription>
      </CardHeader>
      <CardContent class="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          :disabled="collabGroupId == null || collabLoading"
          @click="setAsGroupMainPage()"
        >
          Set as group main page
        </Button>
        <Button
          size="sm"
          variant="destructive"
          :disabled="user?.demo === true"
          @click="softDeleteThisPage()"
        >
          Soft-delete page…
        </Button>
      </CardContent>
    </Card>

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
        <CardTitle>Tiptap + Yjs</CardTitle>
        <CardDescription>
          {{ yStateBytes }} byte(s) in
          <code class="font-mono text-xs">encodeStateAsUpdateV2</code> — rich
          text syncs the ProseMirror
          <code class="font-mono text-xs">Y.XmlFragment</code> (field
          <code class="font-mono text-xs">{{ Y_FRAG_PROSEMIRROR }}</code>
          ); debounced
          <code class="font-mono text-xs">POST …/collab-updates</code>
          (Yjs v2, legacy
          <code class="font-mono text-xs">PageDocUpdate</code>
          AAD). Plain
          <code class="font-mono text-xs">Y.Text("{{ Y_TEXT_DEFAULT }}")</code>
          from earlier builds is migrated into the editor once.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-2">
        <div
          class="border-input bg-background w-full overflow-hidden rounded-md border"
        >
          <template v-if="editor">
            <EditorContent :editor="editor" class="tiptap-editor" />
          </template>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
