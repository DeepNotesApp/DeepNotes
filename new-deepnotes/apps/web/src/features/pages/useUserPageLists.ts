import { ref, type Ref } from "vue";

import { useSession } from "../auth/useSession";

function msgFromBody(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "message" in body &&
    typeof (body as { message?: string }).message === "string"
  ) {
    return (body as { message: string }).message;
  }
  return fallback;
}

/**
 * Loads starting page id, recent list, and favorites from REST (parity with legacy prefs).
 */
export function useUserPageLists() {
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const startingPageId: Ref<string | null> = ref(null);
  const recentPageIds: Ref<string[]> = ref([]);
  const favoritePageIds: Ref<string[]> = ref([]);

  const { client, isAuthenticated } = useSession();

  async function load() {
    if (!isAuthenticated.value) {
      startingPageId.value = null;
      recentPageIds.value = [];
      favoritePageIds.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const [startRes, recentRes, favRes] = await Promise.all([
        client.GET("/api/users/me/pages/starting", {}),
        client.GET("/api/users/me/pages/recent", {}),
        client.GET("/api/users/me/pages/favorites", {}),
      ]);
      if (startRes.response.status !== 200 || !startRes.data) {
        error.value = msgFromBody(startRes.error, "Could not load starting page.");
        return;
      }
      if (recentRes.response.status !== 200 || !recentRes.data) {
        error.value = msgFromBody(recentRes.error, "Could not load recent pages.");
        return;
      }
      if (favRes.response.status !== 200 || !favRes.data) {
        error.value = msgFromBody(favRes.error, "Could not load favorites.");
        return;
      }
      startingPageId.value = startRes.data.startingPageId;
      recentPageIds.value = recentRes.data.pageIds;
      favoritePageIds.value = favRes.data.pageIds;
    } finally {
      loading.value = false;
    }
  }

  async function removeFromRecent(pageIds: string[]): Promise<boolean> {
    if (pageIds.length === 0) {
      return true;
    }
    const res = await client.POST("/api/users/me/pages/recent/remove", {
      body: { pageIds },
    });
    if (res.response.status !== 204) {
      error.value = msgFromBody(res.error, "Could not update recent pages.");
      return false;
    }
    await load();
    return true;
  }

  async function clearRecent(): Promise<boolean> {
    const res = await client.POST("/api/users/me/pages/recent/clear", {});
    if (res.response.status !== 204) {
      error.value = msgFromBody(res.error, "Could not clear recent pages.");
      return false;
    }
    await load();
    return true;
  }

  async function addFavorites(pageIds: string[]): Promise<boolean> {
    if (pageIds.length === 0) {
      return true;
    }
    const res = await client.POST("/api/users/me/pages/favorites", {
      body: { pageIds },
    });
    if (res.response.status !== 204) {
      error.value = msgFromBody(res.error, "Could not add favorites.");
      return false;
    }
    await load();
    return true;
  }

  async function removeFavorites(pageIds: string[]): Promise<boolean> {
    if (pageIds.length === 0) {
      return true;
    }
    const res = await client.POST("/api/users/me/pages/favorites/remove", {
      body: { pageIds },
    });
    if (res.response.status !== 204) {
      error.value = msgFromBody(res.error, "Could not remove favorites.");
      return false;
    }
    await load();
    return true;
  }

  async function clearFavorites(): Promise<boolean> {
    const res = await client.POST("/api/users/me/pages/favorites/clear", {});
    if (res.response.status !== 204) {
      error.value = msgFromBody(res.error, "Could not clear favorites.");
      return false;
    }
    await load();
    return true;
  }

  return {
    loading,
    error,
    startingPageId,
    recentPageIds,
    favoritePageIds,
    load,
    removeFromRecent,
    clearRecent,
    addFavorites,
    removeFavorites,
    clearFavorites,
  };
}
