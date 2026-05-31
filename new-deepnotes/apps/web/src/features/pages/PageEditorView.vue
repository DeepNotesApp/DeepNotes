<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
import PageEditorCollabStatusCard from "./PageEditorCollabStatusCard.vue";
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
import { usePagePathRealtimeTitles } from "./usePagePathRealtimeTitles";
import { usePageSnapshots } from "./usePageSnapshots";
import PageStateScreens from "./screens/PageStateScreens.vue";
import { usePageStatus } from "./usePageStatus";
import { useUserPageLists } from "./useUserPageLists";

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

  <template v-else>
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
      v-else
      :ydoc="ydoc"
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
            {{ pagePathLabel(pid, pathPageLabels) }}
          </RouterLink>
          <span v-else class="text-foreground font-medium">
            {{ pagePathLabel(pid, pathPageLabels) }}
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
      <div class="space-y-3">
        <!-- Current path -->
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
                  {{ pagePathLabel(pid, pathPageLabels) }}
                </RouterLink>
                <span v-else class="text-foreground font-medium">
                  {{ pagePathLabel(pid, pathPageLabels) }}
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

        <!-- Recent pages -->
        <RecentPagesCard
          :recent-page-ids="recentPageIds"
          :current-page-id="pageId"
          :page-labels="pathPageLabels"
          @clear="void clearRecent()"
        />

        <!-- Favorite pages -->
        <FavoritePagesCard
          :favorite-page-ids="favoritePageIds"
          :current-page-id="pageId"
          :page-labels="pathPageLabels"
          @clear="void clearFavorites()"
        />

        <!-- Selected pages -->
        <SelectedPagesCard
          :selected-page-ids="selectedPageIds"
          :current-page-id="pageId"
          :page-labels="pathPageLabels"
          @clear="selectedPageIds = []"
        />

        <!-- Collab status mini -->
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
      </div>
    </template>

    <!-- === Right sidebar === -->
    <template #right-sidebar>
      <div class="space-y-3">
        <PagePropertiesCard
          v-if="!selectedNoteId && !selectedArrowId"
          :page-id="pageId"
          :relative-title="pathPageLabels[pageId]"
          :absolute-title="pathPageLabels[pageId]"
          :is-favorite="isFavorite"
          :read-only="cryptoError !== null"
          @update:relative-title="() => {}"
          @update:absolute-title="() => {}"
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
          @update:pos-x="selectedNoteModel.pos.value.x = $event"
          @update:pos-y="selectedNoteModel.pos.value.y = $event"
          @update:anchor-x="selectedNoteModel.anchor.value.x = $event"
          @update:anchor-y="selectedNoteModel.anchor.value.y = $event"
          @update:width="selectedNoteModel.width.value.expanded = $event"
          @update:color="selectedNoteModel.color.value = $event"
          @update:color-inherit="selectedNoteModel.color.inherit.value = $event"
          @update:collapsible="selectedNoteModel.collapsing.enabled.value = $event"
          @update:collapsed="selectedNoteModel.collapsing.collapsed.value = $event"
          @update:movable="selectedNoteModel.movable.value = $event"
          @update:resizable="selectedNoteModel.resizable.value = $event"
          @update:read-only="selectedNoteModel.readOnly.value = $event"
          @update:container-enabled="selectedNoteModel.container.enabled.value = $event"
          @update:container-horizontal="selectedNoteModel.container.horizontal.value = $event"
        />

        <ArrowPropertiesCard
          v-if="selectedArrowId"
          :arrow-id="selectedArrowId"
          :arrow-model="selectedArrowModel"
          :read-only="cryptoError !== null"
          @update:body-type="selectedArrowModel.bodyType.value = $event"
          @update:source-head="selectedArrowModel.sourceHead.value = $event"
          @update:target-head="selectedArrowModel.targetHead.value = $event"
          @update:color="selectedArrowModel.color.value = $event"
          @update:color-inherit="selectedArrowModel.color.inherit.value = $event"
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
  </template>
</template>
