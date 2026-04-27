import type { DeepnotesApiClient } from "../../api/client";

export type GroupOverviewRow = {
  groupId: string;
  /** `true` when this id matches the signed-in user's personal group. */
  isPersonal: boolean;
  mainPageId: string | null;
  memberUserCount: number | null;
  /** Members list not available (403/404) — e.g. stricter than pages on some edges. */
  membersUnavailable: boolean;
  pageIds: string[];
  pagesHasMore: boolean;
};

/**
 * Lists the caller's groups with main page id, member/user-id count, and first
 * page id window (same 20-item cap as home).
 */
export async function fetchGroupsOverview(input: {
  client: DeepnotesApiClient;
  personalGroupId: string | null;
}): Promise<{ rows: GroupOverviewRow[]; error: string | null }> {
  const { client, personalGroupId } = input;
  const gRes = await client.GET("/api/users/me/groups", {});
  if (gRes.response.status !== 200 || !gRes.data) {
    if (gRes.error && typeof gRes.error === "object" && "message" in gRes.error) {
      return {
        rows: [],
        error: String((gRes.error as { message?: string }).message),
      };
    }
    return { rows: [], error: "Could not list groups." };
  }

  const groupIds = gRes.data.groupIds;
  const rows = await Promise.all(
    groupIds.map(async (groupId): Promise<GroupOverviewRow> => {
      const isPersonal = personalGroupId != null && groupId === personalGroupId;

      const [mainRes, membersRes, pagesRes] = await Promise.all([
        client.GET("/api/groups/{groupId}/main-page", {
          params: { path: { groupId } },
        }),
        client.GET("/api/groups/{groupId}/members", {
          params: { path: { groupId } },
        }),
        client.GET("/api/groups/{groupId}/pages", {
          params: { path: { groupId } },
        }),
      ]);

      const mainPageId =
        mainRes.response.status === 200 && mainRes.data
          ? mainRes.data.mainPageId
          : null;

      let memberUserCount: number | null = null;
      let membersUnavailable = false;
      if (membersRes.response.status === 200 && membersRes.data) {
        memberUserCount = membersRes.data.userIds.length;
      } else if (
        membersRes.response.status === 403 ||
        membersRes.response.status === 404
      ) {
        membersUnavailable = true;
      }

      const pageIds =
        pagesRes.response.status === 200 && pagesRes.data
          ? pagesRes.data.pageIds
          : [];
      const pagesHasMore =
        pagesRes.response.status === 200 && pagesRes.data
          ? pagesRes.data.hasMore
          : false;

      return {
        groupId,
        isPersonal,
        mainPageId,
        memberUserCount,
        membersUnavailable,
        pageIds,
        pagesHasMore,
      };
    }),
  );

  return { rows, error: null };
}
