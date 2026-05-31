<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";

import { useSession } from "../auth/useSession";
import SpatialPageView from "../spatial/SpatialPageView.vue";
import { useUserTemplates } from "../spatial/useUserTemplates";
import PageEditorBacklinksCard from "./PageEditorBacklinksCard.vue";
import PageEditorCollabStatusCard from "./PageEditorCollabStatusCard.vue";
import PageEditorManagementCard from "./PageEditorManagementCard.vue";
import PageEditorPathCard from "./PageEditorPathCard.vue";
import PageEditorSnapshotsCard from "./PageEditorSnapshotsCard.vue";
import PageEditorTiptapCard from "./PageEditorTiptapCard.vue";
import { Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT } from "./page-editor-constants";
import { createPageCollabDoc } from "./page-yjs-doc";
import { usePageCollabEditor } from "./usePageCollabEditor";
import { usePageManagement } from "./usePageManagement";
import { usePagePathAndPrefs } from "./usePagePathAndPrefs";
import { usePagePathRealtimeTitles } from "./usePagePathRealtimeTitles";
import { usePageSnapshots } from "./usePageSnapshots";

import type { SnapshotRow } from "./page-snapshot-list";

const route = useRoute();
const router = useRouter();
const { client, isAuthenticated, user, bootstrapped } = useSession();
const { noteTemplate, arrowTemplate } = useUserTemplates(user);

const pageId = computed(() => String(route.params.pageId ?? ""));

const snapshots = ref<SnapshotRow[]>([]);
const snapshotLoading = ref(false);

const { ydoc, collabAwareness, collabCaretProvider } = createPageCollabDoc();

const pageOpsMessage = ref<string | null>(null);

const collab = usePageCollabEditor({
  ydoc,
  collabAwareness,
  collabCaretProvider,
  pageId,
  user,
  bootstrapped,
  isAuthenticated,
  client,
  snapshots,
  snapshotLoading,
});

const {
  editor,
  pageKeyring,
  hydrating,
  refreshYMetrics,
  schedulePush,
  collabGroupId,
  moveDestGroupId,
  pageEncRelTitleB64,
  pageEncAbsTitleB64,
  collabEncryptedUpdatesForMove,
  collabReloadNonce,
  loadError,
  collabLoading,
  cryptoError,
  collabLastIndex,
  updateCount,
  collabWsLive,
  collabWsError,
  collabGroupCrypto,
  pushError,
  yStateBytes,
  flushPush,
  unlockKeyringWithPassword,
} = collab;

const {
  pathPageIds,
  pathError,
  pathLoading,
  pagePrefsLoading,
  bumpMessage,
  favoriteMessage,
  isFavorite,
  loadPathAndPrefs,
  bumpAsStarting,
  toggleFavorite,
  removeThisFromRecent,
} = usePagePathAndPrefs({
  pageId,
  bootstrapped,
  isAuthenticated,
  client,
});

const { pathPageLabels } = usePagePathRealtimeTitles({
  pathPageIds,
  collabGroupCrypto,
  bootstrapped,
  isAuthenticated,
  collabLoading,
  cryptoError,
});

const snapshotsApi = usePageSnapshots({
  pageId,
  client,
  ydoc,
  pageKeyring,
  hydrating,
  refreshYMetrics,
  schedulePush,
  pageOpsMessage,
});

const management = usePageManagement({
  pageId,
  client,
  router,
  collabGroupId,
  moveDestGroupId,
  pageEncRelTitleB64,
  pageEncAbsTitleB64,
  collabEncryptedUpdatesForMove,
  snapshots,
  pageKeyring,
  pageOpsMessage,
  loadPathAndPrefs,
  collabReloadNonce,
  flushPush,
});

const {
  snapshots: snapshotList,
  snapshotLoading: snapshotsLoading,
  restoreFromSnapshot,
  deleteSnapshot,
  saveSnapshotManual,
} = snapshotsApi;

async function onUnlockWithPassword(password: string) {
  const ok = await unlockKeyringWithPassword(password);
  if (ok) {
    collabReloadNonce.value++;
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
</script>

<template>
  <div v-if="!isAuthenticated" class="text-muted-foreground text-sm" />
  <div v-else class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div>
        <h1 class="text-lg font-semibold">Spatial page</h1>
        <p class="text-muted-foreground text-xs">
          Pages are spatial worlds; this editor focuses the shared rich-text note
          for collab (multi-note canvas parity follows legacy).
        </p>
        <p
          v-if="user"
          class="text-muted-foreground mt-1 font-mono text-xs break-all"
        >
          {{ pageId }} · group {{ collabGroupId ?? "—" }} · personal
          {{ user.personalGroupId }}
        </p>
      </div>
      <Button as-child size="sm" variant="outline">
        <RouterLink to="/">Home</RouterLink>
      </Button>
    </div>

    <PageEditorPathCard
      :path-loading="pathLoading"
      :path-error="pathError"
      :path-page-ids="pathPageIds"
      :path-page-labels="pathPageLabels"
      :page-prefs-loading="pagePrefsLoading"
      :is-favorite="isFavorite"
      :bump-message="bumpMessage"
      :favorite-message="favoriteMessage"
      @bump-as-starting="bumpAsStarting()"
      @toggle-favorite="toggleFavorite()"
      @remove-from-recent="removeThisFromRecent()"
    />

    <p
      v-if="pageOpsMessage"
      class="text-muted-foreground border-border rounded-md border px-3 py-2 text-sm"
    >
      {{ pageOpsMessage }}
    </p>

    <PageEditorSnapshotsCard
      :snapshot-loading="snapshotsLoading"
      :snapshots="snapshotList"
      :collab-loading="collabLoading"
      :load-error="loadError"
      :crypto-error="cryptoError"
      @restore="restoreFromSnapshot($event)"
      @remove="deleteSnapshot($event)"
      @save-manual="saveSnapshotManual()"
    />

    <PageEditorManagementCard
      v-model:move-dest-group-id="moveDestGroupId"
      :collab-loading="collabLoading"
      :load-error="loadError"
      :crypto-error="cryptoError"
      :collab-group-id="collabGroupId"
      @move-to-group="management.movePageToOtherGroup()"
      @set-as-main-page="management.setAsGroupMainPage()"
      @soft-delete="management.softDeleteThisPage()"
      @purge="management.purgeThisPagePermanently()"
    />

    <PageEditorBacklinksCard :page-id="pageId" />

    <SpatialPageView
      :ydoc="ydoc"
      :default-note-template="noteTemplate"
      :default-arrow-template="arrowTemplate"
    />

    <PageEditorCollabStatusCard
      :collab-loading="collabLoading"
      :load-error="loadError"
      :crypto-error="cryptoError"
      :collab-ws-live="collabWsLive"
      :collab-ws-error="collabWsError"
      :update-count="updateCount"
      :collab-last-index="collabLastIndex"
      :push-error="pushError"
      @unlock-with-password="onUnlockWithPassword($event)"
    />

    <PageEditorTiptapCard
      :editor="editor"
      :y-state-bytes="yStateBytes"
      :y-frag-prosemirror="Y_FRAG_PROSEMIRROR"
      :y-text-default="Y_TEXT_DEFAULT"
    />
  </div>
</template>
