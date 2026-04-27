import { ref, type Ref } from "vue";

import { useSession } from "../auth/useSession";

export type GroupPageWindow = {
  groupId: string;
  pageIds: string[];
  hasMore: boolean;
};

/**
 * Fetches `GET /api/users/me/groups` then, for each group, the first page window from
 * `GET /api/groups/:groupId/pages` (max 20 per group).
 */
export function useGroupPages() {
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const groupsWithPages: Ref<GroupPageWindow[]> = ref([]);

  const { client, user, isAuthenticated } = useSession();

  async function load() {
    if (!isAuthenticated.value || user.value == null) {
      groupsWithPages.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const gRes = await client.GET("/api/users/me/groups", {});
      if (gRes.response.status !== 200 || !gRes.data) {
        if (gRes.error && typeof gRes.error === "object" && "message" in gRes.error) {
          error.value = String((gRes.error as { message?: string }).message);
        } else {
          error.value = "Could not list groups.";
        }
        groupsWithPages.value = [];
        return;
      }
      const groupIds = gRes.data.groupIds;
      const windows = await Promise.all(
        groupIds.map(async (groupId) => {
          const pRes = await client.GET("/api/groups/{groupId}/pages", {
            params: { path: { groupId } },
          });
          if (pRes.response.status !== 200 || !pRes.data) {
            return { groupId, pageIds: [] as string[], hasMore: false };
          }
          return {
            groupId,
            pageIds: pRes.data.pageIds,
            hasMore: pRes.data.hasMore,
          };
        }),
      );
      groupsWithPages.value = windows;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    groupsWithPages,
    load,
  };
}
