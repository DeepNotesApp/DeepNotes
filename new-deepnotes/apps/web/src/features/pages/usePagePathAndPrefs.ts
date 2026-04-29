import type { ComputedRef, Ref } from "vue";
import { computed, ref, watch } from "vue";

import type { DeepnotesApiClient } from "@/api/client";

import type { UserMe } from "../auth/useSession";
import { useUserPageLists } from "./useUserPageLists";

export function usePagePathAndPrefs(opts: {
  pageId: ComputedRef<string>;
  bootstrapped: Ref<boolean>;
  isAuthenticated: Ref<boolean>;
  client: DeepnotesApiClient;
  user: Ref<UserMe | null>;
}) {
  const { pageId, bootstrapped, isAuthenticated, client, user } = opts;

  const pathPageIds = ref<string[]>([]);
  const pathError = ref<string | null>(null);
  const pathLoading = ref(false);
  const pagePrefsLoading = ref(false);
  const bumpMessage = ref<string | null>(null);
  const favoriteMessage = ref<string | null>(null);

  const {
    favoritePageIds,
    error: pageListError,
    load: loadPageLists,
    removeFromRecent: removeRecentPages,
    addFavorites,
    removeFavorites,
  } = useUserPageLists();

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

  watch(
    [bootstrapped, isAuthenticated, pageId],
    () => {
      void loadPathAndPrefs();
    },
    { immediate: true },
  );

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

  return {
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
  };
}
