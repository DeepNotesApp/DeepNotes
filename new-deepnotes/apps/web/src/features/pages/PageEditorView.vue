<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "../auth/useSession";
import SpatialPageView from "../spatial/SpatialPageView.vue";
import { useUserTemplates } from "../spatial/useUserTemplates";
import PageEditorBacklinksCard from "./PageEditorBacklinksCard.vue";
import PageEditorLeftSidebar from "./PageEditorLeftSidebar.vue";
import PageEditorManagementCard from "./PageEditorManagementCard.vue";
import PageEditorSnapshotsCard from "./PageEditorSnapshotsCard.vue";
import NotePropertiesCard from "../spatial/NotePropertiesCard.vue";
import ArrowPropertiesCard from "../spatial/ArrowPropertiesCard.vue";
import PagePropertiesCard from "./PagePropertiesCard.vue";
import RecentPagesCard from "./RecentPagesCard.vue";
import FavoritePagesCard from "./FavoritePagesCard.vue";
import SelectedPagesCard from "./SelectedPagesCard.vue";
import { createPageCollabDoc } from "./page-yjs-doc";
import { usePageCollabEditor } from "./usePageCollabEditor";
import { usePageManagement } from "./usePageManagement";
import { usePagePathAndPrefs } from "./usePagePathAndPrefs";
import { base64ToBytes, bytesToBase64 } from "@deepnotes/e2ee";
import {
  decryptPageRelativeTitle,
  decryptPageAbsoluteTitle,
} from "./page-collab-crypto";
import { usePagePathRealtimeTitles } from "./usePagePathRealtimeTitles";
import { buildRealtimeHset, sendRealtimeRequestBatch } from "../realtime/realtime-user-ws";
import { usePageSnapshots } from "./usePageSnapshots";
import PageLayout from "@/layouts/PageLayout.vue";
import PageStateScreens from "./screens/PageStateScreens.vue";
import { usePageStatus } from "./usePageStatus";
import { useUserPageLists } from "./useUserPageLists";
import { cursorColorForUserId } from "./page-awareness-utils";

import type { SnapshotRow } from "./page-snapshot-list";

function pagePathLabel(
  pid: string,
  labels: Record<string, string>,
): string {
  const label = labels[pid];
  if (label != null && label.length > 0) return label;
  return `[Page ${pid}]`;
}

const route = useRoute();
const router = useRouter();
const { client, isAuthenticated, user, bootstrapped } = useSession();
const { noteTemplate, arrowTemplate } = useUserTemplates(user);

const pageId = computed(() => String(route.params.pageId ?? ""));

const snapshots = ref<SnapshotRow[]>([]);
const snapshotLoading = ref(false);

const spatialViewRef = ref<any>(null);

// Track selected note for properties panel
const selectedNoteId = ref<string | null>(null);
const selectedNoteModel = ref<any>(null);

// Track selected arrow for properties panel
const selectedArrowId = ref<string | null>(null);
const selectedArrowModel = ref<any>(null);

// Track recent/favorite/selected pages for left sidebar
const {
  recentPageIds,
  favoritePageIds,
  load: loadUserPageLists,
  clearRecent,
  clearFavorites,
} = useUserPageLists();
const selectedPageIds = ref<string[]>([]);

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

watch(
  () => user.value,
  (u) => {
    if (u) {
      collabAwareness.setLocalStateField("user", {
        name: u.userId,
        color: cursorColorForUserId(u.userId),
      });
    }
  },
  { immediate: true },
);

const { status: pageStatus } = usePageStatus({
  collabLoading,
  loadError,
  cryptoError,
  pageId,
});

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

// Separate reactive overrides so local edits reflect immediately without
// waiting for the async realtime round-trip.
const editedRelativeTitle = ref<string | null>(null);
const editedAbsoluteTitle = ref<string | null>(null);

watch(pageId, () => {
  editedRelativeTitle.value = null;
  editedAbsoluteTitle.value = null;
});

const currentPageRelativeTitle = computed(() => {
  if (editedRelativeTitle.value != null) return editedRelativeTitle.value;
  const id = pageId.value;
  const pk = pageKeyring.value;
  const b64 = pageEncRelTitleB64.value;
  if (!id || !pk || !b64) return `[Page ${id}]`;
  try {
    const t = decryptPageRelativeTitle({
      pageKeyring: pk,
      pageId: id,
      ciphertext: base64ToBytes(b64),
    });
    return t && t.length > 0 ? t : `[Page ${id}]`;
  } catch {
    return `[Page ${id}]`;
  }
});

const currentPageAbsoluteTitle = computed(() => {
  if (editedAbsoluteTitle.value != null) return editedAbsoluteTitle.value;
  const id = pageId.value;
  const fromRealtime = pathPageLabels.value[id];
  if (fromRealtime && fromRealtime.length > 0) return fromRealtime;
  const pk = pageKeyring.value;
  const b64 = pageEncAbsTitleB64.value;
  if (!id || !pk || !b64) return `[Page ${id}]`;
  try {
    const t = decryptPageAbsoluteTitle({
      pageKeyring: pk,
      pageId: id,
      ciphertext: base64ToBytes(b64),
    });
    return t && t.length > 0 ? t : `[Page ${id}]`;
  } catch {
    return `[Page ${id}]`;
  }
});

// Breadcrumb labels: absolute title from realtime, fallback to decrypted bootstrap.
const pageLabels = computed<Record<string, string>>(() => {
  const labels = { ...pathPageLabels.value };
  const id = pageId.value;
  if (labels[id] && labels[id].length > 0) return labels;
  const pk = pageKeyring.value;
  const b64 = pageEncAbsTitleB64.value;
  if (!id || !pk || !b64) return labels;
  try {
    const t = decryptPageAbsoluteTitle({
      pageKeyring: pk,
      pageId: id,
      ciphertext: base64ToBytes(b64),
    });
    if (t && t.length > 0) labels[id] = t;
  } catch {
    // ignore
  }
  return labels;
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

async function onUnlockWithPassword(password: string): Promise<boolean> {
  const ok = await unlockKeyringWithPassword(password);
  if (ok) {
    collabReloadNonce.value++;
  }
  return ok;
}

async function updatePageTitle(type: "relative" | "absolute", value: string) {
  const id = pageId.value;
  const pk = pageKeyring.value;
  if (!id || !pk) return;
  try {
    const ciphertext = pk.encrypt(new TextEncoder().encode(value), {
      padding: true,
      associatedData: {
        context:
          type === "relative" ? "PageRelativeTitle" : "PageAbsoluteTitle",
        pageId: id,
      },
    });
    void sendRealtimeRequestBatch([
      buildRealtimeHset(
        "page",
        id,
        type === "relative"
          ? "encrypted-relative-title"
          : "encrypted-absolute-title",
        bytesToBase64(ciphertext),
      ),
    ]);
    // Optimistic update so the input stays in sync immediately.
    if (type === "relative") {
      editedRelativeTitle.value = value;
    } else {
      editedAbsoluteTitle.value = value;
      // Also update the shared labels map used by breadcrumb/cards.
      pathPageLabels.value = { ...pathPageLabels.value, [id]: value };
    }
  } catch {
    // ignore encrypt failures
  }
}

onMounted(() => {
  if (!isAuthenticated.value) {
    void router.replace({
      name: "login",
      query: { redirect: route.fullPath },
    });
    return;
  }
  void loadUserPageLists();
});
</script>

<template>
  <div v-if="!isAuthenticated" class="text-muted-foreground text-sm" />

  <PageLayout v-else>
    <!-- === Main canvas slot === -->
    <PageStateScreens
      v-if="pageStatus !== 'success'"
      :status="pageStatus"
      :page-id="pageId"
      :group-id="collabGroupId"
      :client="client"
      :load-error="loadError"
      :crypto-error="cryptoError"
      :on-unlock-password="onUnlockWithPassword"
    />
    <SpatialPageView
      ref="spatialViewRef"
      v-else
      :ydoc="ydoc"
      :awareness="collabAwareness"
      :default-note-template="noteTemplate"
      :default-arrow-template="arrowTemplate"
      @select-note="selectedNoteId = $event?.[0] ?? null; selectedNoteModel = $event?.[1] ?? null"
      @select-arrow="selectedArrowId = $event?.[0] ?? null; selectedArrowModel = $event?.[1] ?? null"
    />

    <!-- === Toolbar center: breadcrumb path === -->
    <template #toolbar-center>
      <nav
        v-if="!pathLoading && !pathError && pathPageIds.length > 0"
        class="text-muted-foreground flex flex-wrap items-center justify-center gap-1 text-xs"
      >
        <template v-for="(pid, i) in pathPageIds" :key="pid">
          <span v-if="i > 0" aria-hidden="true">/</span>
          <RouterLink
            v-if="i < pathPageIds.length - 1"
            class="text-primary hover:underline"
            :to="`/pages/${pid}`"
          >
            {{ pagePathLabel(pid, pageLabels) }}
          </RouterLink>
          <span v-else class="text-foreground font-medium">
            {{ pagePathLabel(pid, pageLabels) }}
          </span>
        </template>
      </nav>
      <span v-else-if="pathLoading" class="text-muted-foreground text-xs">
        Loading path…
      </span>
      <span v-else-if="pathError" class="text-destructive text-xs">
        {{ pathError }}
      </span>
    </template>

    <!-- === Left sidebar === -->
    <template #left-sidebar>
      <PageEditorLeftSidebar v-slot="{ activeTab }">
        <!-- Current path -->
        <div v-if="activeTab === 'path'" class="space-y-3">
          <Card>
            <CardHeader class="pb-2">
              <CardTitle class="text-sm">Path</CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 text-xs">
              <p v-if="pathLoading" class="text-muted-foreground">Loading…</p>
              <p v-else-if="pathError" class="text-destructive">{{ pathError }}</p>
              <nav v-else class="text-muted-foreground flex flex-wrap items-center gap-1">
                <template v-for="(pid, i) in pathPageIds" :key="pid">
                  <span v-if="i > 0">/</span>
                  <RouterLink
                    v-if="i < pathPageIds.length - 1"
                    class="text-primary hover:underline"
                    :to="`/pages/${pid}`"
                  >
                    {{ pagePathLabel(pid, pageLabels) }}
                  </RouterLink>
                  <span v-else class="text-foreground font-medium">
                    {{ pagePathLabel(pid, pageLabels) }}
                  </span>
                </template>
              </nav>
              <div class="flex flex-wrap gap-1">
                <Button
                  size="xs"
                  variant="secondary"
                  class="h-6 text-[10px]"
                  :disabled="pagePrefsLoading"
                  @click="bumpAsStarting()"
                >
                  Make starting
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  class="h-6 text-[10px]"
                  :disabled="pagePrefsLoading"
                  @click="toggleFavorite()"
                >
                  {{ isFavorite ? "Unfavorite" : "Favorite" }}
                </Button>
              </div>
              <p v-if="bumpMessage" class="text-muted-foreground text-[10px]">
                {{ bumpMessage }}
              </p>
              <p v-if="favoriteMessage" class="text-amber-700 dark:text-amber-300 text-[10px]">
                {{ favoriteMessage }}
              </p>
            </CardContent>
          </Card>
        </div>

        <!-- Recent pages -->
        <RecentPagesCard
          v-if="activeTab === 'recent'"
          :recent-page-ids="recentPageIds"
          :current-page-id="pageId"
          :page-labels="pageLabels"
          @clear="void clearRecent()"
        />

        <!-- Favorite pages -->
        <FavoritePagesCard
          v-if="activeTab === 'favorites'"
          :favorite-page-ids="favoritePageIds"
          :current-page-id="pageId"
          :page-labels="pageLabels"
          @clear="void clearFavorites()"
        />

        <!-- Selected pages -->
        <SelectedPagesCard
          v-if="activeTab === 'selected'"
          :selected-page-ids="selectedPageIds"
          :current-page-id="pageId"
          :page-labels="pageLabels"
          @clear="selectedPageIds = []"
        />
      </PageEditorLeftSidebar>
    </template>

    <!-- === Right sidebar === -->
    <template #right-sidebar>
      <div class="space-y-3">
        <PagePropertiesCard
          v-if="!selectedNoteId && !selectedArrowId"
          :page-id="pageId"
          :relative-title="currentPageRelativeTitle"
          :absolute-title="currentPageAbsoluteTitle"
          :is-favorite="isFavorite"
          :read-only="cryptoError !== null"
          @update:relative-title="updatePageTitle('relative', $event)"
          @update:absolute-title="updatePageTitle('absolute', $event)"
          @toggle-favorite="toggleFavorite()"
        />

        <NotePropertiesCard
          v-if="selectedNoteId"
          :note-id="selectedNoteId"
          :note-model="selectedNoteModel"
          :read-only="cryptoError !== null"
          @update:link="selectedNoteModel.link.value = $event"
          @update:head-enabled="selectedNoteModel.head.enabled.value = $event"
          @update:body-enabled="selectedNoteModel.body.enabled.value = $event"
          @update:head-wrap="selectedNoteModel.head.wrap.value = $event"
          @update:body-wrap="selectedNoteModel.body.wrap.value = $event"
          @update:pos-x="selectedNoteModel.pos.value.x = $event"
          @update:pos-y="selectedNoteModel.pos.value.y = $event"
          @update:anchor-x="selectedNoteModel.anchor.value.x = $event"
          @update:anchor-y="selectedNoteModel.anchor.value.y = $event"
          @update:width="selectedNoteModel.width.value.expanded = $event"
          @update:height="selectedNoteModel.height.value.expanded = $event"
          @update:color="selectedNoteModel.color.value = $event"
          @update:color-inherit="selectedNoteModel.color.inherit.value = $event"
          @update:collapsible="selectedNoteModel.collapsing.enabled.value = $event"
          @update:collapsed="selectedNoteModel.collapsing.collapsed.value = $event"
          @update:movable="selectedNoteModel.movable.value = $event"
          @update:resizable="selectedNoteModel.resizable.value = $event"
          @update:read-only="selectedNoteModel.readOnly.value = $event"
          @update:container-enabled="selectedNoteModel.container.enabled.value = $event"
          @update:container-horizontal="selectedNoteModel.container.horizontal.value = $event"
          @update:container-spatial="selectedNoteModel.container.spatial.value = $event"
          @update:container-wrap-children="selectedNoteModel.container.wrapChildren.value = $event"
          @update:container-stretch-children="selectedNoteModel.container.stretchChildren.value = $event"
          @update:container-force-color-inheritance="selectedNoteModel.container.forceColorInheritance.value = $event"
        />

        <ArrowPropertiesCard
          v-if="selectedArrowId"
          :arrow-id="selectedArrowId"
          :arrow-model="selectedArrowModel"
          :read-only="cryptoError !== null"
          @update:body-type="selectedArrowModel.bodyType.value = $event"
          @update:body-style="selectedArrowModel.bodyStyle.value = $event"
          @update:source-head="selectedArrowModel.sourceHead.value = $event"
          @update:target-head="selectedArrowModel.targetHead.value = $event"
          @update:color="selectedArrowModel.color.value = $event"
          @update:color-inherit="selectedArrowModel.color.inherit.value = $event"
          @update:read-only="selectedArrowModel.readOnly.value = $event"
        />

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
      </div>
    </template>

    <!-- === Floating overlay === -->
    <template #floating-overlay>
      <!-- Bottom-right info -->
      <div
        class="pointer-events-none absolute bottom-3 right-3 z-20 text-right text-xs"
      >
        <div class="text-primary font-medium">
          {{ pageId }}
        </div>
        <div v-if="collabGroupId" class="text-muted-foreground">
          group {{ collabGroupId }}
        </div>
      </div>

      <!-- Page ops message toast -->
      <div
        v-if="pageOpsMessage"
        class="bg-card border-border pointer-events-auto absolute top-3 left-1/2 z-20 max-w-md -translate-x-1/2 rounded-md border px-3 py-2 text-xs shadow-lg"
      >
        {{ pageOpsMessage }}
      </div>
    </template>
  </PageLayout>
</template>
